import { join } from "node:path";

import type { CleanupContext, CleanupTarget } from "./index.js";

const omxSkills = [
  "ai-slop-cleaner",
  "analyze",
  "ask-claude",
  "ask-gemini",
  "autopilot",
  "autoresearch",
  "cancel",
  "code-review",
  "configure-notifications",
  "deep-interview",
  "doctor",
  "help",
  "hud",
  "note",
  "omx-setup",
  "pipeline",
  "plan",
  "ralph",
  "ralplan",
  "security-review",
  "skill",
  "team",
  "trace",
  "ultraqa",
  "ultrawork",
  "visual-ralph",
  "visual-verdict",
  "wiki",
  "worker",
] as const;
const legacySkills = [
  "product-design-lead",
  "21st-ai",
  "21st-cli-use",
  "21st-design-sync",
  "21st-registry",
  "21st-ui-build",
  "21st-ui-explore",
  "21st-ui-review",
] as const;
const agentLegacySkills = ["slides", "ui-styling"] as const;

export function codexCleanupTargets(homeDir: string): readonly CleanupTarget[] {
  const codexSkills = join(homeDir, ".codex", "skills");
  const agentSkills = join(homeDir, ".agents", "skills");
  return [
    ...legacySkills.map((name) => ({
      id: `cleanup.codex.legacy-skill.${name}`,
      path: join(codexSkills, name),
      kind: "legacy-skill" as const,
    })),
    ...omxSkills.map((name) => ({
      id: `cleanup.codex.omx-skill.${name}`,
      path: join(codexSkills, name),
      kind: "legacy-skill" as const,
    })),
    ...agentLegacySkills.map((name) => ({
      id: `cleanup.agents.legacy-skill.${name}`,
      path: join(agentSkills, name),
      kind: "legacy-skill" as const,
    })),
    {
      id: "cleanup.codex.omx-state",
      path: join(homeDir, ".codex", ".omx"),
      kind: "omx-runtime",
    },
    {
      id: "cleanup.home.omx-state",
      path: join(homeDir, ".omx"),
      kind: "omx-runtime",
    },
  ];
}

export function codexCleanupContext(
  homeDir: string,
  stateDir: string,
): CleanupContext {
  const agentSkills = join(homeDir, ".agents", "skills");
  return {
    stateDir,
    preservePaths: [
      ...[
        "aic-product-design-lead",
        "aic-tdd",
        "aic-domain-modeling",
        "aic-shadcn",
        "aic-ui-components",
        "aic-ui-generate",
        "aic-ui-review",
        "codebase-design",
        "writing-for-agents",
        "ui-ux-pro-max",
        "banner-design",
        "brand",
        "design",
        "design-system",
      ].map((name) => join(agentSkills, name)),
      ...[
        "skill-lore-commit-message",
        "create-crown-harbor-sprite",
        "create-crown-harbor-trailer",
        "codex-primary-runtime",
        ".system",
        ".venv",
        ".idea",
        "config.toml",
      ].map((name) => join(homeDir, ".codex", name)),
    ],
  };
}
