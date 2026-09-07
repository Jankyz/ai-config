import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { InstallerState, TransactionReceipt } from "../core/installer.js";
import { InstallerError } from "../core/installer.js";
import {
  absolutePath,
  atomicWrite,
  inside,
  isNodeError,
  makeDirectories,
  readRegular,
  safePath,
  safeRoot,
} from "../installer/filesystem.js";

export { isNodeError } from "../installer/filesystem.js";
export const STATE_SCHEMA_VERSION = 1 as const;
export const validMode = (mode: unknown): mode is number =>
  Number.isInteger(mode) &&
  typeof mode === "number" &&
  mode >= 0 &&
  mode <= 0o777;
export const validHash = (hash: unknown): hash is string =>
  typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const canonicalTarget = (path: unknown): path is string =>
  absolutePath(path) && resolve(path) === path;

export function validateTransactionId(id: unknown): asserts id is string {
  if (
    typeof id !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      id,
    )
  )
    throw new InstallerError(
      "STATE_INVALID",
      "Transaction ID must be a UUID v4.",
    );
}

export function emptyState(): InstallerState {
  return { schemaVersion: 1, artifacts: {} };
}

export function parseState(source: string): InstallerState {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new InstallerError(
      "STATE_INVALID",
      "Installer state is not valid JSON.",
    );
  }
  if (!record(value) || value.schemaVersion !== 1 || !record(value.artifacts))
    throw new InstallerError(
      "STATE_INVALID",
      "Installer state has an unsupported or invalid schema.",
    );
  const targets = new Set<string>();
  for (const [id, artifact] of Object.entries(value.artifacts)) {
    if (
      !id ||
      !record(artifact) ||
      artifact.id !== id ||
      !canonicalTarget(artifact.targetPath) ||
      (artifact.ownership !== "managed" && artifact.ownership !== "adopted") ||
      !validHash(artifact.contentHash) ||
      (artifact.mode !== undefined && !validMode(artifact.mode)) ||
      typeof artifact.lastTransactionId !== "string" ||
      !artifact.lastTransactionId
    )
      throw new InstallerError(
        "STATE_INVALID",
        "Installer state contains an invalid artifact record.",
      );
    if (targets.has(artifact.targetPath))
      throw new InstallerError(
        "STATE_INCONSISTENCY",
        "Multiple state records own one target.",
      );
    targets.add(artifact.targetPath);
  }
  return value as unknown as InstallerState;
}

export async function validateStateLayout(stateDir: string): Promise<string> {
  await safeRoot(stateDir, "STATE_INVALID");
  const root = resolve(stateDir);
  for (const path of [join(root, "receipts"), join(root, "backups")])
    await safePath(path, "directory", "STATE_INVALID");
  for (const path of [join(root, "state.json"), join(root, "lock.json")])
    await safePath(path, "file", "STATE_INVALID");
  return root;
}

export async function statePath(
  stateDir: string,
  ...parts: string[]
): Promise<string> {
  const root = await validateStateLayout(stateDir);
  const path = join(root, ...parts);
  if (path === root || !inside(root, path))
    throw new InstallerError(
      "STATE_INVALID",
      "State path escapes the explicit state root.",
    );
  await safePath(path, "file", "STATE_INVALID");
  return path;
}

export async function readStateSnapshot(stateDir: string) {
  const path = await statePath(stateDir, "state.json");
  const snapshot = await readRegular(path);
  return {
    snapshot,
    state: snapshot
      ? parseState(snapshot.bytes.toString("utf8"))
      : emptyState(),
  };
}
export async function readState(stateDir: string): Promise<InstallerState> {
  return (await readStateSnapshot(stateDir)).state;
}

export async function atomicJsonWrite(
  stateDir: string,
  path: string,
  value: unknown,
  beforePublish?: () => Promise<void>,
) {
  const root = await validateStateLayout(stateDir);
  if (
    !absolutePath(path) ||
    resolve(path) !== path ||
    !inside(root, path) ||
    path === root
  )
    throw new InstallerError(
      "STATE_INVALID",
      "JSON destination escapes state root.",
    );
  await safePath(path, "file", "STATE_INVALID");
  await makeDirectories(root, dirname(path));
  return atomicWrite(
    path,
    Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
    0o600,
    false,
    async () => {
      await beforePublish?.();
      await validateStateLayout(root);
      await safePath(path, "file", "STATE_INVALID");
    },
  );
}

export async function writeState(
  stateDir: string,
  state: InstallerState,
  beforePublish?: () => Promise<void>,
) {
  parseState(JSON.stringify(state));
  return atomicJsonWrite(
    stateDir,
    await statePath(stateDir, "state.json"),
    state,
    beforePublish,
  );
}
export async function writeReceipt(
  stateDir: string,
  receipt: TransactionReceipt,
): Promise<void> {
  validateTransactionId(receipt.transactionId);
  parseReceipt(JSON.stringify(receipt), receipt.transactionId);
  await atomicJsonWrite(
    stateDir,
    await statePath(stateDir, "receipts", `${receipt.transactionId}.json`),
    receipt,
  );
}

const timestamp = (value: unknown): boolean =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value));

export function parseReceipt(source: string, id: string): TransactionReceipt {
  const invalid = () =>
    new InstallerError(
      "RECOVERY_REQUIRED",
      "Malformed or unsupported transaction receipt.",
    );
  let value: unknown;
  try {
    validateTransactionId(id);
    value = JSON.parse(source);
  } catch {
    throw invalid();
  }
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    value.transactionId !== id ||
    !timestamp(value.startedAt) ||
    typeof value.status !== "string" ||
    !["prepared", "applying", "committed", "rolled_back", "failed"].includes(
      String(value.status),
    ) ||
    !Array.isArray(value.actions) ||
    (value.completedAt !== undefined && !timestamp(value.completedAt)) ||
    (["committed", "rolled_back", "failed"].includes(String(value.status)) &&
      !timestamp(value.completedAt))
  )
    throw invalid();
  const ids = new Set<string>();
  const targets = new Set<string>();
  for (const action of value.actions) {
    if (
      !record(action) ||
      typeof action.artifactId !== "string" ||
      !action.artifactId ||
      !canonicalTarget(action.targetPath) ||
      typeof action.action !== "string" ||
      ![
        "CREATE",
        "ADOPT",
        "REPLACE_UNMANAGED_APPROVED",
        "REPLACE_MANAGED",
        "RECREATE_MISSING_MANAGED",
        "NOOP",
      ].includes(String(action.action)) ||
      (action.beforeHash !== undefined && !validHash(action.beforeHash)) ||
      !validHash(action.afterHash) ||
      (action.beforeMode !== undefined && !validMode(action.beforeMode)) ||
      (action.afterMode !== undefined && !validMode(action.afterMode)) ||
      (action.backupFile !== undefined &&
        (typeof action.backupFile !== "string" ||
          !/^\d+\.bin$/.test(action.backupFile)))
    )
      throw invalid();
    if (ids.has(action.artifactId) || targets.has(action.targetPath))
      throw invalid();
    ids.add(action.artifactId);
    targets.add(action.targetPath);
  }
  if (value.previousState !== undefined && value.previousState !== null) {
    const previous = value.previousState;
    if (
      !record(previous) ||
      !validHash(previous.contentHash) ||
      !validMode(previous.mode) ||
      previous.backupFile !== "state-before.bin"
    )
      throw invalid();
  }
  return value as unknown as TransactionReceipt;
}

export async function assertRecoveryClear(stateDir: string): Promise<void> {
  const root = await validateStateLayout(stateDir);
  let names: string[];
  try {
    names = await readdir(join(root, "receipts"));
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return;
    throw error;
  }
  for (const name of names.sort()) {
    if (!name.endsWith(".json"))
      throw new InstallerError(
        "RECOVERY_REQUIRED",
        "Unexpected transaction evidence requires recovery.",
      );
    try {
      const snapshot = await readRegular(
        await statePath(root, "receipts", name),
      );
      if (!snapshot) throw new Error("Receipt disappeared.");
      const receipt = parseReceipt(
        snapshot.bytes.toString("utf8"),
        name.slice(0, -5),
      );
      if (receipt.status !== "committed" && receipt.status !== "rolled_back")
        throw new Error("Unresolved transaction.");
    } catch {
      throw new InstallerError(
        "RECOVERY_REQUIRED",
        "Transaction evidence requires recovery.",
      );
    }
  }
}
