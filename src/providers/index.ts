import type { ProviderDescriptor } from "../core/index.js";

export * from "./codex/index.js";
export * from "./claude/index.js";

/** The Phase 1 registry establishes provider identity only. */
export const providers: readonly ProviderDescriptor[] = [
  {
    id: "codex",
    displayName: "OpenAI Codex",
  },
  {
    id: "claude",
    displayName: "Claude Code",
  },
];
