import { join } from "node:path";

import type { InstallPlan, InstallerContext } from "../../core/installer.js";
import { planInstall } from "../../installer/index.js";
import {
  validateNativeSkillCatalog,
  type NativeSkillCatalogValidation,
} from "../../skills/index.js";
import type { ClaudeDetection } from "./detect.js";
import { inspectClaude } from "./inspect.js";

export interface ClaudeNativeSkillsPlan {
  readonly catalog: NativeSkillCatalogValidation;
  readonly diagnostics: readonly string[];
  readonly installerPlan?: InstallPlan;
  readonly canApply: boolean;
}

/** Adds Claude's explicit-only flag without changing canonical skill source bytes. */
export function renderClaudeSkillMarkdown(source: string): string {
  const match = source.match(/^---(\r?\n)([\s\S]*?)(\r?\n)---(?=\r?\n|$)/);
  if (!match)
    throw new Error("Canonical SKILL.md must begin with YAML frontmatter.");
  const opening = match[0]!;
  const lineEnding = match[1]!;
  const frontmatter = match[2]!;
  if (/^\s*disable-model-invocation\s*:/m.test(frontmatter))
    throw new Error(
      "Canonical SKILL.md must not contain Claude disable-model-invocation metadata.",
    );
  const remainder = source.slice(opening.length);
  return (
    ["---", frontmatter, "disable-model-invocation: true", "---"].join(
      lineEnding,
    ) + remainder
  );
}

/** Plans only Claude-native skill files; Codex metadata is deliberately excluded. */
export async function planClaudeNativeSkills(input: {
  readonly detection: ClaudeDetection;
  readonly stateDir: string;
}): Promise<ClaudeNativeSkillsPlan> {
  const catalog = await validateNativeSkillCatalog();
  const diagnostics = [...catalog.errors];
  if (input.detection.error) diagnostics.push(input.detection.error);
  else if (!input.detection.installed)
    diagnostics.push("The Claude executable was not found.");
  const inspection = await inspectClaude(input.detection);
  if (!inspection.homeSafe)
    diagnostics.push(
      "Claude config root is unsafe or cannot be created safely.",
    );
  if (input.detection.paths.usesCustomConfigDir)
    diagnostics.push(
      "Custom CLAUDE_CONFIG_DIR is unsupported for configuration apply in Phase 6.",
    );
  if (diagnostics.length) return { catalog, diagnostics, canApply: false };

  let artifacts;
  try {
    artifacts = catalog.skills.flatMap((skill) => [
      {
        id: `claude.user-skill.${skill.name}.instructions`,
        targetPath: join(
          input.detection.paths.userSkillsRoot,
          skill.name,
          "SKILL.md",
        ),
        content: renderClaudeSkillMarkdown(skill.skillMarkdown),
        ownership: "managed" as const,
        mode: 0o644,
      },
      ...skill.bundledAssets.map((asset) => ({
        id: `claude.user-skill.${skill.name}.asset.${asset.path.replaceAll("/", ".")}`,
        targetPath: join(
          input.detection.paths.userSkillsRoot,
          skill.name,
          asset.path,
        ),
        content: asset.content,
        ownership: "managed" as const,
        mode: 0o644,
      })),
    ]);
  } catch (error) {
    diagnostics.push(
      `Cannot render canonical skills for Claude: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { catalog, diagnostics, canApply: false };
  }
  const context: InstallerContext = {
    homeDir: input.detection.paths.home,
    stateDir: input.stateDir,
    allowedTargetRoots: [input.detection.paths.home],
  };
  const installerPlan = await planInstall(context, artifacts);
  return {
    catalog,
    diagnostics,
    installerPlan,
    canApply: installerPlan.canApply,
  };
}
