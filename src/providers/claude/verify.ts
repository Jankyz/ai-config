import { planClaudeCoreWorkflow } from "./core-workflow.js";
import type { ClaudeDetection } from "./detect.js";
import type { HttpClient } from "../../sources/github.js";

export type ClaudeVerificationStatus = "VERIFIED" | "NOT_VERIFIED";

export interface ClaudeVerification {
  readonly status: ClaudeVerificationStatus;
  readonly plan: Awaited<ReturnType<typeof planClaudeCoreWorkflow>>;
}

/** Verifies the complete managed Claude global environment, not model behavior. */
export async function verifyClaudeCoreWorkflow(input: {
  readonly detection: ClaudeDetection;
  readonly stateDir: string;
  readonly dependencyClient?: HttpClient;
  readonly skipExternal?: boolean;
}): Promise<ClaudeVerification> {
  const plan = await planClaudeCoreWorkflow(input);
  const installerPlans = [
    plan.globalInstructions.installerPlan,
    plan.nativeSkills.installerPlan,
  ];
  return {
    status:
      plan.canApply &&
      installerPlans.every(
        (installerPlan) =>
          installerPlan !== undefined &&
          !installerPlan.hasChanges &&
          installerPlan.actions.every((action) => action.kind === "NOOP"),
      )
        ? "VERIFIED"
        : "NOT_VERIFIED",
    plan,
  };
}
