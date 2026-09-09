import { createHash, randomUUID } from "node:crypto";
import { readdir, rm, mkdir, chmod } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { InstallerError } from "../core/installer.js";
import {
  atomicJsonWrite,
  statePath,
  validateStateLayout,
} from "../state/index.js";
import {
  absolutePath,
  readRegular,
  safePath,
  statOrMissing,
} from "../installer/filesystem.js";

export type CleanupKind = "legacy-skill" | "omx-runtime";

export interface CleanupTarget {
  readonly id: string;
  readonly path: string;
  readonly kind: CleanupKind;
}
export interface CleanupEntry {
  readonly path: string;
  readonly type: "directory" | "file";
  readonly mode: number;
  readonly hash?: string;
  readonly bytes?: string;
}
export interface CleanupAction {
  readonly target: CleanupTarget;
  readonly treeDigest: string;
  readonly entries: readonly CleanupEntry[];
}
export interface CleanupPlan {
  readonly transactionId: string;
  readonly actions: readonly CleanupAction[];
  readonly fingerprint: string;
}
export interface CleanupContext {
  readonly stateDir: string;
  readonly preservePaths: readonly string[];
}
interface CleanupReceipt {
  readonly schemaVersion: 1;
  readonly transactionId: string;
  readonly fingerprint: string;
  readonly status: "prepared" | "committed" | "rolled_back" | "failed";
  readonly actions: readonly CleanupAction[];
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
    .join(",")}}`;
}
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const inside = (root: string, path: string) => {
  const part = relative(root, path);
  return (
    part === "" ||
    (part !== ".." && !part.startsWith("../") && !part.startsWith("..\\"))
  );
};

async function inspectTree(root: string): Promise<readonly CleanupEntry[]> {
  const entries: CleanupEntry[] = [];
  async function visit(path: string): Promise<void> {
    const info = await statOrMissing(path);
    if (!info)
      throw new InstallerError(
        "STALE_PLAN",
        "Cleanup target disappeared during inspection.",
      );
    const relativePath = relative(root, path) || ".";
    if (info.isSymbolicLink())
      throw new InstallerError(
        "SYMLINK_TARGET",
        "Cleanup does not follow symbolic links.",
      );
    if (info.isDirectory()) {
      entries.push({
        path: relativePath,
        type: "directory",
        mode: info.mode & 0o777,
      });
      for (const name of (await readdir(path)).sort())
        await visit(join(path, name));
      return;
    }
    if (!info.isFile())
      throw new InstallerError(
        "INVALID_TARGET",
        "Cleanup target contains an unsupported filesystem object.",
      );
    const snapshot = await readRegular(path);
    if (!snapshot)
      throw new InstallerError(
        "STALE_PLAN",
        "Cleanup file disappeared during inspection.",
      );
    entries.push({
      path: relativePath,
      type: "file",
      mode: snapshot.mode & 0o777,
      hash: snapshot.hash,
      bytes: snapshot.bytes.toString("base64"),
    });
  }
  await visit(root);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function treeDigest(entries: readonly CleanupEntry[]): string {
  return sha(
    entries
      .map(
        (entry) =>
          `${entry.path}\0${entry.type}\0${entry.mode}\0${entry.hash ?? ""}\n`,
      )
      .join(""),
  );
}

function verifyTarget(context: CleanupContext, target: CleanupTarget): string {
  if (!target.id || !absolutePath(target.path))
    throw new InstallerError(
      "INVALID_TARGET",
      "Cleanup target must have an explicit non-root absolute path.",
    );
  const path = resolve(target.path);
  if (path === resolve(context.stateDir))
    throw new InstallerError(
      "INVALID_TARGET",
      "Cleanup target cannot be ai-config state.",
    );
  if (
    context.preservePaths.some(
      (preserve) =>
        inside(resolve(preserve), path) || inside(path, resolve(preserve)),
    )
  )
    throw new InstallerError(
      "INVALID_TARGET",
      `Cleanup target overlaps preserved content: ${target.id}`,
    );
  return path;
}

export async function planCleanup(
  context: CleanupContext,
  targets: readonly CleanupTarget[],
): Promise<CleanupPlan> {
  await validateStateLayout(context.stateDir);
  const ids = new Set<string>();
  const paths = new Set<string>();
  const actions: CleanupAction[] = [];
  for (const target of [...targets].sort((a, b) => {
    const rank = (value: CleanupTarget) =>
      value.kind === "omx-runtime" ? 1 : 0;
    return rank(a) - rank(b) || a.id.localeCompare(b.id);
  })) {
    if (ids.has(target.id))
      throw new InstallerError(
        "DUPLICATE_ARTIFACT_ID",
        "Cleanup target IDs must be unique.",
      );
    ids.add(target.id);
    const path = verifyTarget(context, target);
    if (paths.has(path))
      throw new InstallerError(
        "DUPLICATE_TARGET",
        "Cleanup target paths must be unique.",
      );
    paths.add(path);
    await safePath(path, "directory", "INVALID_TARGET");
    const entries = await inspectTree(path);
    actions.push({
      target: { ...target, path },
      entries,
      treeDigest: treeDigest(entries),
    });
  }
  const fingerprint = sha(
    canonical({
      actions: actions.map(({ target, treeDigest }) => ({
        id: target.id,
        path: target.path,
        kind: target.kind,
        treeDigest,
      })),
    }),
  );
  return { transactionId: randomUUID(), actions, fingerprint };
}

async function receiptPath(
  stateDir: string,
  transactionId: string,
): Promise<string> {
  return statePath(stateDir, "cleanup-receipts", `${transactionId}.json`);
}

async function writeReceipt(
  stateDir: string,
  receipt: CleanupReceipt,
): Promise<void> {
  await atomicJsonWrite(
    stateDir,
    await receiptPath(stateDir, receipt.transactionId),
    receipt,
  );
}

async function currentTree(path: string): Promise<readonly CleanupEntry[]> {
  return inspectTree(path);
}

export async function applyCleanup(
  context: CleanupContext,
  targets: readonly CleanupTarget[],
  fingerprint: string,
): Promise<string> {
  const fresh = await planCleanup(context, targets);
  if (fresh.fingerprint !== fingerprint)
    throw new InstallerError(
      "STALE_PLAN",
      "PREVIEW_CHANGED — cleanup preview no longer matches observed targets.",
    );
  const receipt: CleanupReceipt = {
    schemaVersion: 1,
    transactionId: fresh.transactionId,
    fingerprint,
    status: "prepared",
    actions: fresh.actions,
  };
  await writeReceipt(context.stateDir, receipt);
  try {
    for (const action of fresh.actions) {
      const now = await currentTree(action.target.path);
      if (treeDigest(now) !== action.treeDigest)
        throw new InstallerError(
          "STALE_PLAN",
          "PREVIEW_CHANGED — cleanup target changed before removal.",
        );
      await rm(action.target.path, { recursive: true, force: false });
    }
    await writeReceipt(context.stateDir, { ...receipt, status: "committed" });
    return fresh.transactionId;
  } catch (error) {
    await writeReceipt(context.stateDir, {
      ...receipt,
      status: "failed",
    }).catch(() => undefined);
    throw error;
  }
}

export async function rollbackCleanup(
  context: CleanupContext,
  transactionId: string,
): Promise<void> {
  const path = await receiptPath(context.stateDir, transactionId);
  const snapshot = await readRegular(path);
  if (!snapshot)
    throw new InstallerError(
      "RECOVERY_REQUIRED",
      "Cleanup receipt is missing.",
    );
  const receipt = JSON.parse(snapshot.bytes.toString("utf8")) as CleanupReceipt;
  if (
    receipt.schemaVersion !== 1 ||
    receipt.transactionId !== transactionId ||
    receipt.status !== "committed"
  )
    throw new InstallerError(
      "RECOVERY_REQUIRED",
      "Cleanup receipt is invalid or not committed.",
    );
  for (const action of receipt.actions) {
    if (await statOrMissing(action.target.path))
      throw new InstallerError(
        "RECOVERY_REQUIRED",
        "Cleanup target was recreated; rollback refuses to overwrite it.",
      );
  }
  for (const action of receipt.actions) {
    for (const entry of action.entries
      .filter((entry) => entry.type === "directory")
      .sort((a, b) => a.path.localeCompare(b.path))) {
      const path =
        entry.path === "."
          ? action.target.path
          : join(action.target.path, entry.path);
      await mkdir(path, { recursive: true, mode: entry.mode });
      await chmod(path, entry.mode);
    }
    for (const entry of action.entries.filter(
      (entry) => entry.type === "file",
    )) {
      const path = join(action.target.path, entry.path);
      const parent = dirname(path);
      await mkdir(parent, { recursive: true, mode: 0o700 });
      const bytes = Buffer.from(entry.bytes!, "base64");
      await atomicJsonWrite(
        context.stateDir,
        await statePath(
          context.stateDir,
          "cleanup-restore",
          `${transactionId}-${sha(path)}.json`,
        ),
        { bytes: bytes.toString("base64") },
      );
      await rm(path, { force: true }).catch(() => undefined);
      await import("node:fs/promises").then(({ writeFile }) =>
        writeFile(path, bytes, { mode: entry.mode }),
      );
      await chmod(path, entry.mode);
    }
  }
  await writeReceipt(context.stateDir, { ...receipt, status: "rolled_back" });
}
