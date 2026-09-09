import { readGlobalAgentContract } from "../../standards/index.js";
import type { ClaudeDetection } from "./detect.js";
import {
  planClaudeGlobalInstructions,
  type ClaudeGlobalInstructionsPlan,
} from "./plan.js";
import {
  planClaudeNativeSkills,
  type ClaudeNativeSkillsPlan,
} from "./skills.js";
import type { HttpClient } from "../../sources/github.js";

export interface ClaudeCoreWorkflowPlan {
  readonly globalInstructions: ClaudeGlobalInstructionsPlan;
  readonly nativeSkills: ClaudeNativeSkillsPlan;
  readonly canApply: boolean;
}

/** Composes Claude's global instructions and native skills without a generic framework. */
export async function planClaudeCoreWorkflow(input: {
  readonly detection: ClaudeDetection;
  readonly stateDir: string;
  readonly replaceConflictArtifactIds?: readonly string[] | undefined;
  readonly dependencyClient?: HttpClient;
  readonly skipExternal?: boolean;
}): Promise<ClaudeCoreWorkflowPlan> {
  const [content, nativeSkills] = await Promise.all([
    readGlobalAgentContract(),
    planClaudeNativeSkills({
      detection: input.detection,
      stateDir: input.stateDir,
      replaceConflictArtifactIds: input.replaceConflictArtifactIds?.filter(
        (id) =>
          id.startsWith("claude.user-skill.") ||
          id.startsWith("claude.external-skill."),
      ),
      ...(input.dependencyClient === undefined
        ? {}
        : { dependencyClient: input.dependencyClient }),
      ...(input.skipExternal ? { skipExternal: true } : {}),
    }),
  ]);
  const globalInstructions = await planClaudeGlobalInstructions({
    detection: input.detection,
    stateDir: input.stateDir,
    content,
    replaceConflictArtifactIds: input.replaceConflictArtifactIds?.filter(
      (id) => id === "claude.global.instructions",
    ),
  });
  return {
    globalInstructions,
    nativeSkills,
    canApply: globalInstructions.canApply && nativeSkills.canApply,
  };
}
