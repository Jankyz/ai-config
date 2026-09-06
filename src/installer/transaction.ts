import { open, rmdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  ArtifactReceipt,
  InstallAction,
  InstallPlan,
  InstallerContext,
  TransactionReceipt,
} from "../core/installer.js";
import { InstallerError } from "../core/installer.js";
import {
  assertRecoveryClear,
  readStateSnapshot,
  statePath,
  validateStateLayout,
  validateTransactionId,
  validMode,
  writeReceipt,
  writeState,
} from "../state/index.js";
import {
  atomicWrite,
  hashContent,
  isNodeError,
  makeDirectories,
  matchesFile,
  readRegular,
  safePath,
  statOrMissing,
} from "./filesystem.js";
import type { FileEvidence, FileSnapshot } from "./filesystem.js";
import { revalidate, validateTarget } from "./planner.js";

/** Narrow deterministic seams for handled-failure tests; never part of desired artifact data. */
export interface ApplyOptions {
  readonly beforeWrite?: (
    action: InstallAction,
    index: number,
  ) => Promise<void> | void;
  readonly afterWrite?: (
    action: InstallAction,
    index: number,
  ) => Promise<void> | void;
  readonly afterStateWrite?: () => Promise<void> | void;
  readonly beforeStateRestore?: () => Promise<void> | void;
}

interface Mutation {
  action: InstallAction;
  before: FileSnapshot | undefined;
  after: FileEvidence;
  backupPath?: string;
}

async function requireEvidence(
  path: string,
  evidence: FileEvidence | undefined,
): Promise<void> {
  await safePath(path, "file", "RECOVERY_REQUIRED");
  if (!matchesFile(await readRegular(path), evidence))
    throw new InstallerError(
      "RECOVERY_REQUIRED",
      `File identity, bytes, or mode changed: ${path}`,
    );
}

async function privateBackup(
  root: string,
  transactionId: string,
  name: string,
  bytes: Buffer,
): Promise<string> {
  const path = await statePath(root, "backups", transactionId, name);
  await makeDirectories(root, dirname(path));
  const written = await atomicWrite(path, bytes, 0o600, true, async () => {
    await statePath(root, "backups", transactionId, name);
  });
  await requireEvidence(path, written);
  return path;
}

async function lockTransaction(root: string, transactionId: string) {
  await makeDirectories(root, root);
  const path = await statePath(root, "lock.json");
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
  } catch (error) {
    if (isNodeError(error, "EEXIST"))
      throw new InstallerError(
        "TRANSACTION_LOCKED",
        "An existing lock blocks mutation.",
      );
    throw error;
  }
  const metadata = `${JSON.stringify({ schemaVersion: 1, transactionId, pid: process.pid, createdAt: new Date().toISOString() })}\n`;
  let owned: FileEvidence;
  try {
    await handle.chmod(0o600);
    await handle.writeFile(metadata);
    const info = await handle.stat();
    owned = {
      dev: info.dev,
      ino: info.ino,
      mode: 0o600,
      hash: hashContent(metadata),
    };
  } finally {
    await handle.close();
  }
  const evidence = await readRegular(path);
  if (!matchesFile(evidence, owned))
    throw new InstallerError(
      "RECOVERY_REQUIRED",
      "Transaction lock disappeared or was replaced.",
    );
  return { path, evidence: owned };
}

async function releaseLock(
  root: string,
  lock: { path: string; evidence: FileEvidence },
): Promise<void> {
  try {
    await statePath(root, "lock.json");
    await requireEvidence(lock.path, lock.evidence);
    await unlink(lock.path);
  } catch {
    throw new InstallerError(
      "RECOVERY_REQUIRED",
      "Transaction lock could not be safely released.",
    );
  }
}

export async function applyInstallPlan(
  contextInput: InstallerContext,
  planInput: InstallPlan,
  options: ApplyOptions = {},
): Promise<TransactionReceipt | undefined> {
  // Callers can pass runtime objects. Validate IDs before any path or directory use.
  validateTransactionId(planInput.transactionId);
  const context = structuredClone(contextInput);
  const plan = structuredClone(planInput);
  if (!plan.canApply || plan.conflicts.length)
    throw new InstallerError(
      "STATE_INVALID",
      "Conflicting plans cannot be applied.",
    );
  const changing = plan.actions.some((action) => action.kind !== "NOOP");
  if (changing !== plan.hasChanges)
    throw new InstallerError("STALE_PLAN", "Inconsistent plan flags.");
  if (!changing) return undefined;
  const root = await validateStateLayout(context.stateDir);
  for (const action of plan.actions)
    await validateTarget(context, action.artifact.targetPath);
  const lock = await lockTransaction(root, plan.transactionId);
  let keepLock = false;
  let receipt: TransactionReceipt | undefined;
  let previous: Awaited<ReturnType<typeof readStateSnapshot>> | undefined;
  let publishedState: FileEvidence | undefined;
  const mutations: Mutation[] = [];
  const createdDirectories: string[] = [];
  try {
    await assertRecoveryClear(root);
    // Reject replayed IDs before replacing any old receipt or backup evidence.
    if (
      (await statOrMissing(
        await statePath(root, "receipts", `${plan.transactionId}.json`),
      )) ||
      (await statOrMissing(join(root, "backups", plan.transactionId)))
    )
      throw new InstallerError(
        "STATE_INVALID",
        "Transaction ID has already been used.",
      );
    previous = await readStateSnapshot(root);
    if (previous.snapshot && !validMode(previous.snapshot.mode))
      throw new InstallerError("STATE_INVALID", "Unsupported state file mode.");
    await revalidate(context, plan.actions);
    const stateFile = await statePath(root, "state.json");
    await requireEvidence(stateFile, previous.snapshot);
    const details: ArtifactReceipt[] = plan.actions.map((action) => ({
      artifactId: action.artifact.id,
      targetPath: action.artifact.targetPath,
      action: action.kind,
      ...(action.expectedHash === undefined
        ? {}
        : { beforeHash: action.expectedHash }),
      ...(action.expectedMode === undefined
        ? {}
        : { beforeMode: action.expectedMode }),
      afterHash: action.desiredHash,
      afterMode: action.intendedMode,
    }));
    receipt = {
      schemaVersion: 1,
      transactionId: plan.transactionId,
      startedAt: new Date().toISOString(),
      status: "prepared",
      actions: details,
      previousState: previous.snapshot
        ? {
            contentHash: previous.snapshot.hash,
            mode: previous.snapshot.mode,
            backupFile: "state-before.bin",
          }
        : null,
    };
    await writeReceipt(root, receipt);
    if (previous.snapshot)
      await privateBackup(
        root,
        plan.transactionId,
        "state-before.bin",
        previous.snapshot.bytes,
      );
    receipt = { ...receipt, status: "applying" };
    await writeReceipt(root, receipt);
    const nextState = structuredClone(previous.state);
    for (const [index, action] of plan.actions.entries()) {
      if (action.kind === "NOOP") continue;
      await options.beforeWrite?.(structuredClone(action), index);
      await requireEvidence(stateFile, previous.snapshot);
      await revalidate(context, [action]);
      const target = action.artifact.targetPath;
      const before = await readRegular(target);
      let backupPath: string | undefined;
      if (before) {
        backupPath = await privateBackup(
          root,
          plan.transactionId,
          `${index}.bin`,
          before.bytes,
        );
        details[index] = {
          ...details[index]!,
          backupFile: `${index}.bin`,
          beforeMode: before.mode,
        };
        await writeReceipt(root, receipt);
      }
      const allowedRoot = await validateTarget(context, target);
      await makeDirectories(allowedRoot, dirname(target), createdDirectories);
      const content =
        typeof action.artifact.content === "string"
          ? Buffer.from(action.artifact.content)
          : action.artifact.content;
      const after = await atomicWrite(
        target,
        content,
        action.intendedMode,
        action.expectedAbsent,
        async () => {
          await requireEvidence(stateFile, previous!.snapshot);
          await revalidate(context, [action]);
          await requireEvidence(target, before);
        },
      );
      // Track only after publication succeeds, before hooks or verification can fail.
      mutations.push({
        action,
        before,
        after,
        ...(backupPath === undefined ? {} : { backupPath }),
      });
      await options.afterWrite?.(structuredClone(action), index);
      await requireEvidence(target, after);
      Object.defineProperty(nextState.artifacts, action.artifact.id, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: {
          id: action.artifact.id,
          targetPath: target,
          ownership: "managed",
          contentHash: action.desiredHash,
          ...(action.managedMode === undefined
            ? {}
            : { mode: action.managedMode }),
          lastTransactionId: plan.transactionId,
        },
      });
    }
    const verifyTargets = async () => {
      await revalidate(
        context,
        plan.actions.filter((action) => action.kind === "NOOP"),
      );
      for (const mutation of mutations) {
        await validateTarget(context, mutation.action.artifact.targetPath);
        await requireEvidence(
          mutation.action.artifact.targetPath,
          mutation.after,
        );
      }
    };
    await verifyTargets();
    await requireEvidence(stateFile, previous.snapshot);
    publishedState = await writeState(root, nextState, () =>
      requireEvidence(stateFile, previous!.snapshot),
    );
    await requireEvidence(stateFile, publishedState);
    await options.afterStateWrite?.();
    // State now contains new records, so verify NOOP targets against their unchanged records only.
    await verifyTargets();
    await requireEvidence(stateFile, publishedState);
    receipt = {
      ...receipt,
      status: "committed",
      completedAt: new Date().toISOString(),
    };
    await writeReceipt(root, receipt);
    return receipt;
  } catch (error) {
    if (!receipt) throw error;
    let failed = false;
    for (const mutation of [...mutations].reverse()) {
      try {
        const target = mutation.action.artifact.targetPath;
        await validateTarget(context, target);
        await requireEvidence(target, mutation.after);
        if (mutation.before && mutation.backupPath) {
          await safePath(mutation.backupPath, "file", "RECOVERY_REQUIRED");
          const backup = await readRegular(mutation.backupPath);
          if (
            !backup ||
            backup.hash !== mutation.before.hash ||
            backup.mode !== 0o600
          )
            throw new Error("Backup verification failed.");
          const restored = await atomicWrite(
            target,
            backup.bytes,
            mutation.before.mode,
            false,
            () => requireEvidence(target, mutation.after),
          );
          await requireEvidence(target, restored);
        } else {
          await unlink(target);
          if (await statOrMissing(target))
            throw new Error("Created target removal could not be verified.");
        }
      } catch {
        failed = true;
      }
    }
    if (publishedState && previous) {
      try {
        await options.beforeStateRestore?.();
        const path = await statePath(root, "state.json");
        await requireEvidence(path, publishedState);
        if (previous.snapshot) {
          const restored = await atomicWrite(
            path,
            previous.snapshot.bytes,
            previous.snapshot.mode,
            false,
            () => requireEvidence(path, publishedState),
          );
          await requireEvidence(path, restored);
        } else {
          await unlink(path);
          if (await statOrMissing(path))
            throw new Error("State removal could not be verified.");
        }
      } catch {
        failed = true;
      }
    }
    if (!publishedState && previous) {
      try {
        await requireEvidence(
          await statePath(root, "state.json"),
          previous.snapshot,
        );
      } catch {
        failed = true;
      }
    }
    for (const directory of [...createdDirectories].reverse()) {
      try {
        await safePath(directory, "directory", "RECOVERY_REQUIRED");
        await rmdir(directory);
      } catch (cleanupError) {
        if (
          !isNodeError(cleanupError, "ENOTEMPTY") &&
          !isNodeError(cleanupError, "ENOENT")
        )
          failed = true;
      }
    }
    receipt = {
      ...receipt,
      status: failed ? "failed" : "rolled_back",
      completedAt: new Date().toISOString(),
    };
    try {
      await writeReceipt(root, receipt);
    } catch {
      failed = true;
    }
    if (failed) {
      keepLock = true;
      throw new InstallerError(
        "RECOVERY_REQUIRED",
        "Rollback or recovery evidence could not be verified; lock and backups retained.",
      );
    }
    throw error;
  } finally {
    if (!keepLock) await releaseLock(root, lock);
  }
}
