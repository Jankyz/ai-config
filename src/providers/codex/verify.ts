import { planCodexGlobalInstructions } from "./plan.js";
import type { CodexDetection } from "./detect.js";

export type CodexVerificationStatus = "VERIFIED" | "NOT_VERIFIED";

export interface CodexVerification {
  readonly status: CodexVerificationStatus;
  readonly plan: Awaited<ReturnType<typeof planCodexGlobalInstructions>>;
}

export async function verifyCodexGlobalInstructions(input: {
  readonly detection: CodexDetection;
  readonly stateDir: string;
  readonly content: string | Uint8Array;
}): Promise<CodexVerification> {
  const plan = await planCodexGlobalInstructions(input);
  const installerPlan = plan.installerPlan;
  return {
    status:
      plan.canApply &&
      installerPlan !== undefined &&
      !installerPlan.hasChanges &&
      installerPlan.actions.every((action) => action.kind === "NOOP")
        ? "VERIFIED"
        : "NOT_VERIFIED",
    plan,
  };
}
