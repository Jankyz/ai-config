import { dirname, join } from "node:path";
import type { InstallPlan, InstallerContext } from "../../core/installer.js";
import { planInstall } from "../../installer/index.js";
import {
  validateNativeSkillCatalog,
  type NativeSkillCatalogValidation,
} from "../../skills/index.js";
import type { CodexDetection } from "./detect.js";
export interface CodexNativeSkillsPlan {
  readonly catalog: NativeSkillCatalogValidation;
  readonly diagnostics: readonly string[];
  readonly installerPlan?: InstallPlan;
  readonly canApply: boolean;
}
/** Plans the two regular-file artifacts for each canonical Phase 4 user skill. */
export async function planCodexNativeSkills(input: {
  readonly detection: CodexDetection;
  readonly stateDir: string;
}): Promise<CodexNativeSkillsPlan> {
  const catalog = await validateNativeSkillCatalog();
  const diagnostics = [...catalog.errors];
  if (input.detection.error) diagnostics.push(input.detection.error);
  else if (!input.detection.installed)
    diagnostics.push("The Codex executable was not found.");
  if (diagnostics.length) return { catalog, diagnostics, canApply: false };
  const root = input.detection.paths.userSkillsRoot;
  const context: InstallerContext = {
    homeDir: dirname(root),
    stateDir: input.stateDir,
    allowedTargetRoots: [dirname(root)],
  };
  const installerPlan = await planInstall(
    context,
    catalog.skills.flatMap((skill) => [
      {
        id: `codex.user-skill.${skill.name}.instructions`,
        targetPath: join(root, skill.name, "SKILL.md"),
        content: skill.skillMarkdown,
        ownership: "managed" as const,
        mode: 0o644,
      },
      {
        id: `codex.user-skill.${skill.name}.metadata`,
        targetPath: join(root, skill.name, "agents", "openai.yaml"),
        content: skill.codexMetadata,
        ownership: "managed" as const,
        mode: 0o644,
      },
    ]),
  );
  return {
    catalog,
    diagnostics,
    installerPlan,
    canApply: installerPlan.canApply,
  };
}
