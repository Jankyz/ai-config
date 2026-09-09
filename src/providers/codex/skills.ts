import { dirname, join } from "node:path";
import type { InstallPlan, InstallerContext } from "../../core/installer.js";
import { planInstall } from "../../installer/index.js";
import {
  externalSkillAssets,
  validateNativeSkillCatalog,
  type NativeSkillCatalogValidation,
} from "../../skills/index.js";
import type { CodexDetection } from "./detect.js";
import type { HttpClient } from "../../sources/github.js";
export interface CodexNativeSkillsPlan {
  readonly catalog: NativeSkillCatalogValidation;
  readonly externalSkillNames: readonly string[];
  readonly diagnostics: readonly string[];
  readonly installerPlan?: InstallPlan;
  readonly canApply: boolean;
}
/** Plans the regular-file artifacts for each canonical native user skill. */
export async function planCodexNativeSkills(input: {
  readonly detection: CodexDetection;
  readonly stateDir: string;
  readonly replaceConflictArtifactIds?: readonly string[] | undefined;
  readonly dependencyClient?: HttpClient;
  readonly skipExternal?: boolean;
}): Promise<CodexNativeSkillsPlan> {
  const [catalog, external] = await Promise.all([
    validateNativeSkillCatalog(),
    input.skipExternal
      ? Promise.resolve([])
      : externalSkillAssets("codex", input.dependencyClient),
  ]);
  const diagnostics = [...catalog.errors];
  if (input.detection.error) diagnostics.push(input.detection.error);
  else if (!input.detection.installed)
    diagnostics.push("The Codex executable was not found.");
  if (diagnostics.length)
    return {
      catalog,
      externalSkillNames: external.map((skill) => skill.name),
      diagnostics,
      canApply: false,
    };
  const root = input.detection.paths.userSkillsRoot;
  const context: InstallerContext = {
    homeDir: dirname(root),
    stateDir: input.stateDir,
    allowedTargetRoots: [dirname(root)],
  };
  const installerPlan = await planInstall(
    context,
    [
      ...catalog.skills.flatMap((skill) => [
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
        ...skill.bundledAssets.map((asset) => ({
          id: `codex.user-skill.${skill.name}.asset.${asset.path.replaceAll("/", ".")}`,
          targetPath: join(root, skill.name, asset.path),
          content: asset.content,
          ownership: "managed" as const,
          mode: 0o644,
        })),
      ]),
      ...external.flatMap((skill) =>
        skill.files.map((file) => ({
          id: `codex.external-skill.${skill.name}.${file.path.replaceAll("/", ".")}`,
          targetPath: join(root, skill.name, file.path),
          content: file.content,
          ownership: "managed" as const,
          mode: 0o644,
        })),
      ),
    ],
    { replaceConflictArtifactIds: input.replaceConflictArtifactIds },
  );
  return {
    catalog,
    externalSkillNames: external.map((skill) => skill.name),
    diagnostics,
    installerPlan,
    canApply: installerPlan.canApply,
  };
}
