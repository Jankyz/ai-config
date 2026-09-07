import type { CodexDetection } from "./detect.js";
import {
  planCodexGlobalInstructions,
  type CodexGlobalInstructionsPlan,
} from "./plan.js";
import { planCodexNativeSkills, type CodexNativeSkillsPlan } from "./skills.js";
import { readGlobalAgentContract } from "../../standards/index.js";
export interface CodexCoreWorkflowPlan {
  readonly globalInstructions: CodexGlobalInstructionsPlan;
  readonly nativeSkills: CodexNativeSkillsPlan;
  readonly canApply: boolean;
}
/** Composes Phase 3 global instructions and Phase 4 user skills without a generic framework. */
export async function planCodexCoreWorkflow(input: {
  readonly detection: CodexDetection;
  readonly stateDir: string;
  readonly replaceConflictArtifactIds?: readonly string[] | undefined;
}): Promise<CodexCoreWorkflowPlan> {
  const [content, nativeSkills] = await Promise.all([
    readGlobalAgentContract(),
    planCodexNativeSkills({
      detection: input.detection,
      stateDir: input.stateDir,
      replaceConflictArtifactIds: input.replaceConflictArtifactIds?.filter(
        (id) => id.startsWith("codex.user-skill."),
      ),
    }),
  ]);
  const globalInstructions = await planCodexGlobalInstructions({
    detection: input.detection,
    stateDir: input.stateDir,
    content,
    replaceConflictArtifactIds: input.replaceConflictArtifactIds?.filter(
      (id) => id === "codex.global.instructions",
    ),
  });
  return {
    globalInstructions,
    nativeSkills,
    canApply: globalInstructions.canApply && nativeSkills.canApply,
  };
}
