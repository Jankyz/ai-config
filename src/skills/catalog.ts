import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  projectTemplatePaths,
  projectTemplateRoot,
  validateProjectTemplates,
} from "../templates/index.js";

export const nativeSkillNames = [
  "aic-research",
  "aic-clarify",
  "aic-analyze",
  "aic-plan",
  "aic-implement",
  "aic-diagnose",
  "aic-review",
  "aic-verify",
  "aic-security-review",
  "aic-lore-commit",
  "aic-bootstrap-project",
  "aic-ui-components",
  "aic-ui-generate",
  "aic-ui-review",
] as const;
export type NativeSkillName = (typeof nativeSkillNames)[number];
export interface NativeSkillBundledAsset {
  readonly path: string;
  readonly content: Uint8Array;
}
export interface NativeSkillAsset {
  readonly name: NativeSkillName;
  readonly directory: string;
  readonly skillMarkdown: string;
  readonly codexMetadata: string;
  readonly bundledAssets: readonly NativeSkillBundledAsset[];
}
export interface NativeSkillCatalogValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly skills: readonly NativeSkillAsset[];
}

const skillRoot = fileURLToPath(new URL("../../skills", import.meta.url));
const forbiddenContent = /\b(?:TODO|TBD|placeholder)\b/i;
const personalPath = /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/;
function frontmatterValue(source: string, key: "name" | "description") {
  const match = source.match(
    new RegExp(
      `^---\\r?\\n[\\s\\S]*?^${key}:\\s*(.+?)\\s*$[\\s\\S]*?^---\\s*$`,
      "m",
    ),
  );
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
}
function metadataValue(source: string) {
  const match = source.match(/^\s*default_prompt:\s*["']?(.+?)["']?\s*$/m);
  return match?.[1]?.trim();
}
export function nativeSkillRoot(): string {
  return skillRoot;
}
/** Reads and validates the deliberately small, static Phase 4 native-skill catalog. */
export async function validateNativeSkillCatalog(): Promise<NativeSkillCatalogValidation> {
  const errors: string[] = [];
  const templateValidation = await validateProjectTemplates();
  errors.push(...templateValidation.errors);
  let directories: string[] = [];
  try {
    directories = (await readdir(skillRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    errors.push(`Cannot read native skill root: ${String(error)}`);
  }
  const expected = [...nativeSkillNames].sort();
  if (directories.join("\n") !== expected.join("\n"))
    errors.push(
      "Skill directories must contain exactly the approved canonical skills.",
    );
  const seen = new Set<string>();
  const skills: NativeSkillAsset[] = [];
  for (const name of nativeSkillNames) {
    const directory = join(skillRoot, name);
    const skillPath = join(directory, "SKILL.md");
    const metadataPath = join(directory, "agents", "openai.yaml");
    try {
      const [skillMarkdown, codexMetadata, bundledAssets] = await Promise.all([
        readFile(skillPath, "utf8"),
        readFile(metadataPath, "utf8"),
        name === "aic-bootstrap-project"
          ? Promise.all(
              projectTemplatePaths.map(async (path) => ({
                path: join("assets", "project", path),
                content: await readFile(join(projectTemplateRoot(), path)),
              })),
            )
          : Promise.resolve([]),
      ]);
      const declaredName = frontmatterValue(skillMarkdown, "name");
      const description = frontmatterValue(skillMarkdown, "description");
      if (declaredName !== name)
        errors.push(`${name}: frontmatter name must match its directory.`);
      if (!description) errors.push(`${name}: description must be non-empty.`);
      if (seen.has(declaredName ?? ""))
        errors.push(`${name}: duplicate skill name.`);
      if (declaredName) seen.add(declaredName);
      if (
        !/^policy:\s*\n\s+allow_implicit_invocation:\s*false\s*$/m.test(
          codexMetadata,
        )
      )
        errors.push(
          `${name}: Codex metadata must disable implicit invocation.`,
        );
      if (!metadataValue(codexMetadata)?.includes(`$${name}`))
        errors.push(`${name}: default_prompt must reference $${name}.`);
      if (
        forbiddenContent.test(skillMarkdown) ||
        forbiddenContent.test(codexMetadata)
      )
        errors.push(`${name}: files must not contain placeholders.`);
      if (personalPath.test(skillMarkdown) || personalPath.test(codexMetadata))
        errors.push(`${name}: files must not contain personal absolute paths.`);
      if (skillMarkdown.length > 12_000 || codexMetadata.length > 2_000)
        errors.push(`${name}: files exceed the Phase 4 size budget.`);
      skills.push({
        name,
        directory,
        skillMarkdown,
        codexMetadata,
        bundledAssets,
      });
    } catch (error) {
      errors.push(
        `${name}: missing or unreadable required asset: ${String(error)}`,
      );
    }
  }
  return { valid: errors.length === 0, errors, skills };
}
