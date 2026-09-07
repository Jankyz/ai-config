import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type {
  DesiredArtifact,
  FileClassification,
  InstallAction,
  InstallConflict,
  InstallPlan,
  InstallerContext,
  InstalledArtifactState,
  PlanInstallOptions,
} from "../core/installer.js";
import { InstallerError } from "../core/installer.js";
import { readState, validMode, validateStateLayout } from "../state/index.js";
import {
  absolutePath,
  hashContent,
  inside,
  readRegular,
  safePath,
  safeRoot,
  statOrMissing,
} from "./filesystem.js";

export async function validateTarget(
  context: InstallerContext,
  target: string,
): Promise<string> {
  if (!absolutePath(target))
    throw new InstallerError(
      "INVALID_TARGET",
      "Target must be an explicit non-root absolute path.",
    );
  const normalized = resolve(target);
  const stateRoot = await validateStateLayout(context.stateDir);
  if (inside(stateRoot, normalized) || inside(normalized, stateRoot))
    throw new InstallerError(
      "INVALID_TARGET",
      "Artifacts must not overlap installer state.",
    );
  for (const root of context.allowedTargetRoots)
    await safeRoot(root, "INVALID_TARGET");
  const root = context.allowedTargetRoots
    .map((entry) => resolve(entry))
    .find((entry) => entry !== normalized && inside(entry, normalized));
  if (!root)
    throw new InstallerError(
      "INVALID_TARGET",
      "Target is outside an allowed root or is the root itself.",
    );
  await safePath(dirname(normalized), "directory", "INVALID_TARGET");
  return root;
}

async function inspect(
  target: string,
  recorded: InstalledArtifactState | null,
) {
  const info = await statOrMissing(target);
  let classification: FileClassification;
  if (!info)
    return {
      classification: recorded
        ? ("MANAGED_MISSING" as const)
        : ("ABSENT" as const),
    };
  if (info.isSymbolicLink())
    return { classification: "SYMLINK_CONFLICT" as const };
  if (!info.isFile()) return { classification: "UNMANAGED_EXISTING" as const };
  const current = await readRegular(target);
  if (!current)
    throw new InstallerError(
      "STALE_PLAN",
      "File disappeared during inspection.",
    );
  if (!validMode(current.mode))
    throw new InstallerError(
      "INVALID_TARGET",
      "Special permission bits are unsupported.",
    );
  if (!recorded) classification = "UNMANAGED_EXISTING";
  else
    classification =
      current.hash === recorded.contentHash &&
      (recorded.mode === undefined || recorded.mode === current.mode)
        ? "MANAGED_UNCHANGED"
        : "MANAGED_DRIFTED";
  return { classification, hash: current.hash, mode: current.mode };
}

export async function planInstall(
  context: InstallerContext,
  desired: readonly DesiredArtifact[],
  options: PlanInstallOptions = {},
): Promise<InstallPlan> {
  const transactionId = randomUUID();
  const conflicts: InstallConflict[] = [];
  const actions: InstallAction[] = [];
  const replaceConflictArtifactIds = [
    ...new Set(options.replaceConflictArtifactIds ?? []),
  ].sort();
  const result = (): InstallPlan => ({
    transactionId,
    actions,
    conflicts,
    ...(replaceConflictArtifactIds.length === 0
      ? {}
      : { replaceConflictArtifactIds }),
    hasChanges: actions.some((action) => action.kind !== "NOOP"),
    canApply: conflicts.length === 0,
  });
  let state;
  try {
    state = await readState(context.stateDir);
  } catch (error) {
    if (!(error instanceof InstallerError)) throw error;
    conflicts.push({ kind: error.kind, detail: error.message });
    return result();
  }
  const ids = new Set<string>();
  const targets = new Set<string>();
  for (const artifact of desired) {
    if (!artifact.id || ids.has(artifact.id))
      conflicts.push({
        kind: "DUPLICATE_ARTIFACT_ID",
        detail: "IDs must be non-empty and unique.",
      });
    ids.add(artifact.id);
    if (!absolutePath(artifact.targetPath)) {
      conflicts.push({
        kind: "INVALID_TARGET",
        detail: "Target must be an explicit absolute path.",
      });
      continue;
    }
    const target = resolve(artifact.targetPath);
    if (targets.has(target))
      conflicts.push({
        kind: "DUPLICATE_TARGET",
        detail: "Targets must be unique.",
      });
    targets.add(target);
    if (artifact.ownership !== "managed")
      conflicts.push({
        kind: "UNSUPPORTED_ADOPTED_WRITE",
        detail: "Only managed writes are supported.",
      });
    if (
      (artifact.mode !== undefined && !validMode(artifact.mode)) ||
      !(
        typeof artifact.content === "string" ||
        artifact.content instanceof Uint8Array
      )
    )
      conflicts.push({
        kind: "INVALID_TARGET",
        detail: "Invalid desired bytes or permission mode.",
      });
  }
  for (const id of replaceConflictArtifactIds) {
    if (!id || !ids.has(id))
      conflicts.push({
        kind: "STATE_INVALID",
        ...(id ? { artifactId: id } : {}),
        detail:
          "Conflict replacement authorization must name one desired artifact ID.",
      });
  }
  if (conflicts.length) {
    for (const artifact of desired) {
      if (
        absolutePath(artifact.targetPath) &&
        !context.allowedTargetRoots.some(
          (root) =>
            absolutePath(root) &&
            resolve(root) !== resolve(artifact.targetPath) &&
            inside(resolve(root), resolve(artifact.targetPath)),
        )
      )
        conflicts.push({
          kind: "INVALID_TARGET",
          detail: "Target is outside allowed roots.",
        });
    }
    return result();
  }
  const sorted = [...desired].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  for (const input of sorted) {
    const artifact: DesiredArtifact = {
      ...input,
      targetPath: resolve(input.targetPath),
      content:
        typeof input.content === "string"
          ? input.content
          : new Uint8Array(input.content),
    };
    const { id, targetPath } = artifact;
    const addConflict = (kind: InstallConflict["kind"], detail: string) =>
      conflicts.push({ kind, artifactId: id, targetPath, detail });
    try {
      await validateTarget(context, input.targetPath);
    } catch (error) {
      if (!(error instanceof InstallerError)) throw error;
      addConflict(error.kind, error.message);
      continue;
    }
    const known = Object.hasOwn(state.artifacts, id)
      ? state.artifacts[id]!
      : null;
    if (known && known.targetPath !== targetPath) {
      addConflict(
        "STATE_INCONSISTENCY",
        "Artifact target migration is unsupported.",
      );
      continue;
    }
    if (
      Object.values(state.artifacts).some(
        (entry) => entry.targetPath === targetPath && entry.id !== id,
      )
    ) {
      addConflict(
        "STATE_INCONSISTENCY",
        "Target belongs to another artifact ID.",
      );
      continue;
    }
    const observed = await inspect(targetPath, known);
    const desiredHash = hashContent(artifact.content);
    const managedMode = artifact.mode ?? known?.mode;
    const intendedMode = managedMode ?? observed.mode ?? 0o644;
    let kind: InstallAction["kind"];
    switch (observed.classification) {
      case "ABSENT":
        kind = "CREATE";
        break;
      case "MANAGED_MISSING":
        kind = "RECREATE_MISSING_MANAGED";
        break;
      case "MANAGED_UNCHANGED":
        kind =
          observed.hash === desiredHash &&
          observed.mode === intendedMode &&
          managedMode === known?.mode
            ? "NOOP"
            : "REPLACE_MANAGED";
        break;
      case "MANAGED_DRIFTED":
        addConflict(
          "MANAGED_DRIFT",
          "Managed bytes or managed mode changed locally.",
        );
        continue;
      case "SYMLINK_CONFLICT":
        addConflict("SYMLINK_TARGET", "Target is a symbolic link.");
        continue;
      default:
        if (
          observed.hash === desiredHash &&
          observed.mode === intendedMode &&
          known === null
        ) {
          kind = "ADOPT";
          break;
        }
        if (
          observed.classification === "UNMANAGED_EXISTING" &&
          replaceConflictArtifactIds.includes(id)
        ) {
          kind = "REPLACE_UNMANAGED_APPROVED";
          break;
        }
        addConflict(
          "UNMANAGED_EXISTS",
          "Existing content has no managed ownership evidence matching the desired artifact.",
        );
        continue;
    }
    actions.push({
      kind,
      artifact,
      classification: observed.classification,
      desiredHash,
      expectedRecord: known ? structuredClone(known) : null,
      expectedAbsent:
        observed.classification === "ABSENT" ||
        observed.classification === "MANAGED_MISSING",
      ...(observed.hash === undefined ? {} : { expectedHash: observed.hash }),
      ...(observed.mode === undefined ? {} : { expectedMode: observed.mode }),
      intendedMode,
      ...(managedMode === undefined ? {} : { managedMode }),
    });
  }
  return result();
}

/** Recompute semantic preconditions, including NOOPs, under the caller's transaction lock. */
export async function revalidate(
  context: InstallerContext,
  actions: readonly InstallAction[],
  replaceConflictArtifactIds: readonly string[] = [],
): Promise<void> {
  const fresh = await planInstall(
    context,
    actions.map((action) => action.artifact),
    { replaceConflictArtifactIds },
  );
  if (!fresh.canApply || !isDeepStrictEqual(fresh.actions, actions))
    throw new InstallerError(
      "STALE_PLAN",
      "Filesystem, ownership, mode, classification, or plan data changed since planning.",
    );
}
