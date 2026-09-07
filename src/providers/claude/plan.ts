import type { InstallPlan, InstallerContext } from "../../core/installer.js";
import { planInstall } from "../../installer/index.js";
import type { ClaudeDetection } from "./detect.js";
import { inspectClaude } from "./inspect.js";

export type ClaudeDiagnosticKind =
  | "INVALID_CLAUDE_CONFIG_DIR"
  | "CLAUDE_CUSTOM_CONFIG_DIR_UNVERIFIED"
  | "CLAUDE_NOT_DETECTED"
  | "CLAUDE_DETECTION_ERROR"
  | "EMPTY_GLOBAL_INSTRUCTIONS";

export interface ClaudeDiagnostic {
  readonly kind: ClaudeDiagnosticKind;
  readonly detail: string;
}

export interface ClaudeGlobalInstructionsPlan {
  readonly detection: ClaudeDetection;
  readonly diagnostics: readonly ClaudeDiagnostic[];
  readonly installerPlan?: InstallPlan;
  readonly canApply: boolean;
}

export interface PlanClaudeGlobalInstructionsInput {
  readonly detection: ClaudeDetection;
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

export async function planClaudeGlobalInstructions(
  input: PlanClaudeGlobalInstructionsInput,
): Promise<ClaudeGlobalInstructionsPlan> {
  const diagnostics: ClaudeDiagnostic[] = [];
  if (input.detection.error)
    diagnostics.push({
      kind: "CLAUDE_DETECTION_ERROR",
      detail: input.detection.error,
    });
  else if (!input.detection.installed)
    diagnostics.push({
      kind: "CLAUDE_NOT_DETECTED",
      detail: "The Claude executable was not found.",
    });
  if (!hasInstructions(input.content))
    diagnostics.push({
      kind: "EMPTY_GLOBAL_INSTRUCTIONS",
      detail: "Global instructions must contain non-whitespace content.",
    });

  const inspection = await inspectClaude(input.detection);
  if (!inspection.homeSafe)
    diagnostics.push({
      kind: "INVALID_CLAUDE_CONFIG_DIR",
      detail: "Claude config root is unsafe or cannot be created safely.",
    });
  if (input.detection.paths.usesCustomConfigDir)
    diagnostics.push({
      kind: "CLAUDE_CUSTOM_CONFIG_DIR_UNVERIFIED",
      detail:
        "Custom CLAUDE_CONFIG_DIR is detected but unsupported for configuration apply in Phase 6.",
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
        id: "claude.global.instructions",
        targetPath: input.detection.paths.globalClaude,
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
