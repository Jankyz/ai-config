import type { InstallPlan, InstallerContext } from "../../core/installer.js";
import { planInstall } from "../../installer/index.js";
import { inspectCodex } from "./inspect.js";
import type { CodexDetection } from "./detect.js";

export type CodexDiagnosticKind =
  | "INVALID_CODEX_HOME"
  | "CODEX_NOT_DETECTED"
  | "CODEX_DETECTION_ERROR"
  | "EMPTY_GLOBAL_INSTRUCTIONS"
  | "CODEX_GLOBAL_OVERRIDE_ACTIVE"
  | "CODEX_GLOBAL_OVERRIDE_UNSAFE";

export interface CodexDiagnostic {
  readonly kind: CodexDiagnosticKind;
  readonly detail: string;
}

export interface CodexGlobalInstructionsPlan {
  readonly detection: CodexDetection;
  readonly diagnostics: readonly CodexDiagnostic[];
  readonly installerPlan?: InstallPlan;
  readonly canApply: boolean;
}

export interface PlanCodexGlobalInstructionsInput {
  readonly detection: CodexDetection;
  readonly stateDir: string;
  readonly content: string | Uint8Array;
  readonly replaceConflictArtifactIds?: readonly string[] | undefined;
}

function hasInstructions(content: string | Uint8Array): boolean {
  return /\S/.test(
    typeof content === "string"
      ? content
      : Buffer.from(content).toString("utf8"),
  );
}

export async function planCodexGlobalInstructions(
  input: PlanCodexGlobalInstructionsInput,
): Promise<CodexGlobalInstructionsPlan> {
  const diagnostics: CodexDiagnostic[] = [];
  if (input.detection.error)
    diagnostics.push({
      kind: "CODEX_DETECTION_ERROR",
      detail: input.detection.error,
    });
  else if (!input.detection.installed)
    diagnostics.push({
      kind: "CODEX_NOT_DETECTED",
      detail: "The Codex executable was not found.",
    });
  if (!hasInstructions(input.content))
    diagnostics.push({
      kind: "EMPTY_GLOBAL_INSTRUCTIONS",
      detail: "Global instructions must contain non-whitespace content.",
    });

  const inspection = await inspectCodex(input.detection);
  if (!inspection.homeSafe)
    diagnostics.push({
      kind: "INVALID_CODEX_HOME",
      detail: "Codex home is unsafe or cannot be created safely.",
    });
  else if (
    inspection.globalOverride.kind === "REGULAR" &&
    inspection.globalOverride.active
  )
    diagnostics.push({
      kind: "CODEX_GLOBAL_OVERRIDE_ACTIVE",
      detail: "AGENTS.override.md shadows global AGENTS.md.",
    });
  else if (!["ABSENT", "REGULAR"].includes(inspection.globalOverride.kind))
    diagnostics.push({
      kind: "CODEX_GLOBAL_OVERRIDE_UNSAFE",
      detail: "AGENTS.override.md is not a safe regular file.",
    });

  if (diagnostics.length)
    return { detection: input.detection, diagnostics, canApply: false };
  const context: InstallerContext = {
    homeDir: input.detection.paths.home,
    stateDir: input.stateDir,
    allowedTargetRoots: [input.detection.paths.home],
  };
  const installerPlan = await planInstall(
    context,
    [
      {
        id: "codex.global.instructions",
        targetPath: input.detection.paths.globalAgents,
        content: input.content,
        ownership: "managed",
        mode: 0o644,
      },
    ],
    { replaceConflictArtifactIds: input.replaceConflictArtifactIds },
  );
  return {
    detection: input.detection,
    diagnostics,
    installerPlan,
    canApply: installerPlan.canApply,
  };
}
