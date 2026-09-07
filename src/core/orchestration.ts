import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, resolve } from "node:path";

import type { DesiredArtifact, InstallPlan } from "./installer.js";
import { applyInstallPlan, planInstall } from "../installer/index.js";
import {
  detectClaude,
  planClaudeCoreWorkflow,
  type ClaudeCoreWorkflowPlan,
} from "../providers/claude/index.js";
import {
  detectCodex,
  planCodexCoreWorkflow,
  type CodexCoreWorkflowPlan,
} from "../providers/codex/index.js";
import { validateSourceState } from "../sources/lock.js";
import { assertRecoveryClear, readState } from "../state/index.js";
import type { ProviderId } from "./provider.js";

export interface RuntimeRoots {
  readonly homeDir: string;
  readonly stateDir: string;
  readonly env: Readonly<Record<string, string | undefined>>;
}

export interface ProviderOperationPlan {
  readonly provider: ProviderId;
  readonly diagnostics: readonly string[];
  readonly plan?: InstallPlan;
  readonly roots: readonly string[];
}

export interface ProviderOperationOptions {
  readonly replaceConflictArtifactIds?: readonly string[] | undefined;
}

function canonicalSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalSerialize(entry)).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(
      ([key, entry]) => `${JSON.stringify(key)}:${canonicalSerialize(entry)}`,
    )
    .join(",")}}`;
}

/** Binds owner review to one deterministic, complete provider operation proposal. */
export function operationApprovalFingerprint(
  operation: ProviderOperationPlan,
  mode: "setup" | "update",
): string {
  if (!operation.plan || !operationCanApply(operation))
    throw new Error(
      "BLOCKED: only an applicable operation can be fingerprinted.",
    );
  const material = {
    provider: operation.provider,
    mode,
    replaceConflictArtifactIds: [
      ...(operation.plan.replaceConflictArtifactIds ?? []),
    ].sort(),
    actions: operation.plan.actions
      .map((action) => ({
        kind: action.kind,
        artifactId: action.artifact.id,
        targetPath: action.artifact.targetPath,
        classification: action.classification,
        expectedHash: action.expectedHash ?? null,
        expectedMode: action.expectedMode ?? null,
        expectedAbsent: action.expectedAbsent,
        expectedRecord: action.expectedRecord
          ? {
              id: action.expectedRecord.id,
              targetPath: action.expectedRecord.targetPath,
              ownership: action.expectedRecord.ownership,
              contentHash: action.expectedRecord.contentHash,
              mode: action.expectedRecord.mode ?? null,
              lastTransactionId: action.expectedRecord.lastTransactionId,
            }
          : null,
        desiredHash: action.desiredHash,
        desiredMode: action.intendedMode,
        managedMode: action.managedMode ?? null,
      }))
      .sort((left, right) =>
        left.artifactId < right.artifactId
          ? -1
          : left.artifactId > right.artifactId
            ? 1
            : 0,
      ),
  };
  return createHash("sha256")
    .update(canonicalSerialize(material))
    .digest("hex");
}

export function assertOperationApprovalFingerprint(
  operation: ProviderOperationPlan,
  mode: "setup" | "update",
  approved: string,
): void {
  if (operationApprovalFingerprint(operation, mode) !== approved)
    throw new Error(
      "PREVIEW_CHANGED — approved preview no longer matches current migration plan. Run setup preview again and review the new fingerprint.",
    );
}

export function runtimeRoots(
  env: Readonly<Record<string, string | undefined>> = process.env,
): RuntimeRoots {
  const homeDir = env.HOME;
  const configuredState = env.AI_CONFIG_HOME;
  if (!homeDir || !isAbsolute(homeDir))
    throw new Error("HOME must be an explicit absolute path.");
  if (
    configuredState !== undefined &&
    configuredState !== "" &&
    !isAbsolute(configuredState)
  )
    throw new Error("AI_CONFIG_HOME must be an explicit absolute path.");
  return {
    homeDir: resolve(homeDir),
    stateDir: resolve(configuredState || join(homeDir, ".ai-config")),
    env,
  };
}

function diagnosticsFor(
  plan: CodexCoreWorkflowPlan | ClaudeCoreWorkflowPlan,
): string[] {
  return [
    ...plan.globalInstructions.diagnostics.map(
      ({ kind, detail }) => `${kind}: ${detail}`,
    ),
    ...plan.nativeSkills.diagnostics,
    ...(plan.globalInstructions.installerPlan?.conflicts.map(
      (conflict) =>
        `CONFLICT ${conflict.artifactId ?? "provider"} [${conflict.kind}]: ${conflict.detail}`,
    ) ?? []),
    ...(plan.nativeSkills.installerPlan?.conflicts.map(
      (conflict) =>
        `CONFLICT ${conflict.artifactId ?? "provider"} [${conflict.kind}]: ${conflict.detail}`,
    ) ?? []),
  ];
}

function artifactsFor(
  plan: CodexCoreWorkflowPlan | ClaudeCoreWorkflowPlan,
): DesiredArtifact[] {
  return [
    ...(plan.globalInstructions.installerPlan?.actions.map(
      (action) => action.artifact,
    ) ?? []),
    ...(plan.nativeSkills.installerPlan?.actions.map(
      (action) => action.artifact,
    ) ?? []),
  ];
}

/** Composes existing provider plans into one Phase 2 transaction without provider-specific writes here. */
export async function planProviderOperation(
  provider: ProviderId,
  mode: "setup" | "update",
  roots = runtimeRoots(),
  options: ProviderOperationOptions = {},
): Promise<ProviderOperationPlan> {
  const diagnostics: string[] = [];
  try {
    await assertRecoveryClear(roots.stateDir);
  } catch (error) {
    diagnostics.push(
      `RECOVERY_REQUIRED: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (mode === "update") {
    try {
      if (Object.keys((await readState(roots.stateDir)).artifacts).length === 0)
        diagnostics.push(
          "BLOCKED: update requires existing ai-config ownership state.",
        );
    } catch (error) {
      diagnostics.push(
        `STATE_INVALID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (provider === "codex") {
    const detection = await detectCodex({
      homeDir: roots.homeDir,
      env: roots.env,
    });
    const workflow = await planCodexCoreWorkflow({
      detection,
      stateDir: roots.stateDir,
      replaceConflictArtifactIds: options.replaceConflictArtifactIds,
    });
    diagnostics.push(...diagnosticsFor(workflow));
    const artifacts = artifactsFor(workflow);
    const allowedTargetRoots = [
      detection.paths.home,
      dirname(detection.paths.userSkillsRoot),
    ];
    const plan = diagnostics.length
      ? undefined
      : await planInstall(
          {
            homeDir: roots.homeDir,
            stateDir: roots.stateDir,
            allowedTargetRoots,
          },
          artifacts,
          {
            replaceConflictArtifactIds: options.replaceConflictArtifactIds,
          },
        );
    return {
      provider,
      diagnostics,
      ...(plan === undefined ? {} : { plan }),
      roots: allowedTargetRoots,
    };
  }
  const detection = await detectClaude({
    homeDir: roots.homeDir,
    env: roots.env,
  });
  const workflow = await planClaudeCoreWorkflow({
    detection,
    stateDir: roots.stateDir,
    replaceConflictArtifactIds: options.replaceConflictArtifactIds,
  });
  diagnostics.push(...diagnosticsFor(workflow));
  const artifacts = artifactsFor(workflow);
  const allowedTargetRoots = [detection.paths.home];
  const plan = diagnostics.length
    ? undefined
    : await planInstall(
        {
          homeDir: roots.homeDir,
          stateDir: roots.stateDir,
          allowedTargetRoots,
        },
        artifacts,
        { replaceConflictArtifactIds: options.replaceConflictArtifactIds },
      );
  return {
    provider,
    diagnostics,
    ...(plan === undefined ? {} : { plan }),
    roots: allowedTargetRoots,
  };
}

export async function applyProviderOperation(
  operation: ProviderOperationPlan,
  roots = runtimeRoots(),
) {
  if (operation.diagnostics.length || !operation.plan)
    throw new Error("BLOCKED: provider operation is not applicable.");
  return applyInstallPlan(
    {
      homeDir: roots.homeDir,
      stateDir: roots.stateDir,
      allowedTargetRoots: operation.roots,
    },
    operation.plan,
  );
}

/** Validates distributable source metadata without consuming remote data. */
export async function sourceHealth(): Promise<string | undefined> {
  try {
    const base = new URL("../../", import.meta.url);
    const [registry, lock] = await Promise.all([
      readFile(new URL("upstream/registry.json", base), "utf8"),
      readFile(new URL("upstream/lock.json", base), "utf8"),
    ]);
    validateSourceState(JSON.parse(registry), JSON.parse(lock));
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function operationStatus(operation: ProviderOperationPlan): string[] {
  if (operation.diagnostics.length)
    return operation.diagnostics.map((detail) => `BLOCKED ${detail}`);
  if (!operation.plan) return ["BLOCKED no provider plan available"];
  if (operation.plan.conflicts.length)
    return operation.plan.conflicts.map(
      (conflict) =>
        `CONFLICT ${conflict.artifactId ?? "provider"}: ${conflict.detail}`,
    );
  if (!operation.plan.actions.length || !operation.plan.hasChanges)
    return ["NOOP already current"];
  return operation.plan.actions.map((action) => {
    const kind =
      action.kind === "REPLACE_MANAGED" ||
      action.kind === "RECREATE_MISSING_MANAGED"
        ? "UPDATE"
        : action.kind;
    return `${kind} ${action.artifact.id}`;
  });
}

export function operationCanApply(operation: ProviderOperationPlan): boolean {
  return Boolean(
    operation.plan?.canApply && operation.diagnostics.length === 0,
  );
}
