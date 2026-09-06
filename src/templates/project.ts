import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const projectTemplatePaths = [
  "AGENTS.md",
  "CONTEXT.md",
  "ARCHITECTURE.md",
  "DESIGN.md",
  "docs/README.md",
] as const;
export const projectTemplateAssetPaths = [
  "README.md",
  ...projectTemplatePaths,
] as const;
export type ProjectTemplatePath = (typeof projectTemplatePaths)[number];
export type ProjectScaffoldStatus = "CREATE" | "PRESERVE" | "CONFLICT" | "SKIP";
export interface ProjectTemplateValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const templateRoot = fileURLToPath(
  new URL("../../templates/project", import.meta.url),
);
const personalPath = /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/;
const accidentalPlaceholder = /\b(?:TODO|placeholder)\b/i;

export function projectTemplateRoot(): string {
  return templateRoot;
}

/** Resolves an existing intended root before inspecting any untrusted descendants. */
export async function resolveProjectRoot(projectRoot: string): Promise<string> {
  if (!isAbsolute(projectRoot))
    throw new Error("Project root must be an absolute path.");
  const physicalRoot = await realpath(projectRoot);
  if (!(await lstat(physicalRoot)).isDirectory())
    throw new Error("Project root must be an existing directory.");
  return physicalRoot;
}

function isInsideProjectRoot(root: string, candidate: string): boolean {
  const part = relative(root, candidate);
  return part !== ".." && !part.startsWith(`..${sep}`) && !isAbsolute(part);
}

export async function validateProjectTemplates(): Promise<ProjectTemplateValidation> {
  const errors: string[] = [];
  for (const path of projectTemplateAssetPaths) {
    try {
      const source = await readFile(join(templateRoot, path), "utf8");
      if (personalPath.test(source))
        errors.push(`${path}: must not contain personal absolute paths.`);
      if (accidentalPlaceholder.test(source))
        errors.push(`${path}: must not contain accidental placeholder syntax.`);
    } catch (error) {
      errors.push(`${path}: missing or unreadable template: ${String(error)}`);
    }
  }
  try {
    const agents = await readFile(join(templateRoot, "AGENTS.md"), "utf8");
    if (agents.length > 1_600)
      errors.push("AGENTS.md: exceeds the compact project-guidance budget.");
    if (/\b(?:OMX|model routing|provider paths)\b/i.test(agents))
      errors.push("AGENTS.md: must not duplicate the global agent contract.");
  } catch {
    // The missing asset is already reported by the required-template pass.
  }
  return { valid: errors.length === 0, errors };
}

/** Inspects the bounded scaffold only; actual creation remains the explicit skill's responsibility. */
export async function classifyProjectScaffold(
  projectRoot: string,
  options: { readonly includeDesign?: boolean } = {},
): Promise<Record<ProjectTemplatePath, ProjectScaffoldStatus>> {
  const physicalRoot = await resolveProjectRoot(projectRoot);
  const result = {} as Record<ProjectTemplatePath, ProjectScaffoldStatus>;
  for (const path of projectTemplatePaths) {
    let current = physicalRoot;
    for (const [index, segment] of path.split("/").entries()) {
      current = resolve(join(current, segment));
      if (!isInsideProjectRoot(physicalRoot, current)) {
        result[path] = "CONFLICT";
        break;
      }
      try {
        const entry = await lstat(current);
        if (index === path.split("/").length - 1) {
          result[path] = entry.isFile() ? "PRESERVE" : "CONFLICT";
        } else if (!entry.isDirectory()) {
          result[path] = "CONFLICT";
        }
      } catch (error) {
        result[path] =
          (error as NodeJS.ErrnoException).code === "ENOENT"
            ? path === "DESIGN.md" && !options.includeDesign
              ? "SKIP"
              : "CREATE"
            : "CONFLICT";
      }
      if (result[path]) break;
    }
  }
  return result;
}
