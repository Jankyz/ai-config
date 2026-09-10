import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import {
  acquireGitHubArchiveResources,
  createHttpsClient,
  type HttpClient,
} from "../sources/github.js";
import {
  validateSourceState,
  verifyLicenseEvidence,
  verifyLockedResourceDigest,
  type SourceLock,
} from "../sources/lock.js";
import type { SourceRegistry } from "../sources/registry.js";

export interface ExternalSkillAsset {
  readonly name:
    | "codebase-design"
    | "wayfinder"
    | "grill-me"
    | "grilling"
    | "writing-for-agents"
    | "ui-ux-pro-max";
  readonly files: readonly {
    readonly path: string;
    readonly content: Uint8Array;
  }[];
}

const root = fileURLToPath(new URL("../../", import.meta.url));

async function sourceState(): Promise<{
  readonly registry: SourceRegistry;
  readonly lock: SourceLock;
}> {
  const [registryBytes, lockBytes] = await Promise.all([
    readFile(join(root, "upstream", "registry.json"), "utf8"),
    readFile(join(root, "upstream", "lock.json"), "utf8"),
  ]);
  const registry = JSON.parse(registryBytes) as SourceRegistry;
  const lock = JSON.parse(lockBytes) as SourceLock;
  validateSourceState(registry, lock);
  return { registry, lock };
}

async function acquireLockedResource(input: {
  readonly client: HttpClient;
  readonly registry: SourceRegistry;
  readonly lock: SourceLock;
  readonly sourceId: string;
  readonly resourceId: string;
}): Promise<
  readonly { readonly path: string; readonly content: Uint8Array }[]
> {
  const source = input.registry.sources.find(
    (entry) => entry.id === input.sourceId,
  );
  const locked = input.lock.sources.find(
    (entry) => entry.sourceId === input.sourceId,
  );
  const resource = source?.resources.find(
    (entry) => entry.id === input.resourceId,
  );
  if (
    !source ||
    !locked ||
    !resource?.path ||
    source.kind !== "github" ||
    !source.repository ||
    !locked.commit
  )
    throw new Error(
      `Locked GitHub resource is unavailable: ${input.resourceId}`,
    );
  const acquiredResources = await acquireGitHubArchiveResources(
    input.client,
    source.repository,
    locked.commit,
    [source.license.evidence, resource.path],
  );
  const license = acquiredResources.get(source.license.evidence)!;
  const acquired = acquiredResources.get(resource.path)!;
  if (license.files.length !== 1)
    throw new Error(`Locked license evidence is not one file: ${source.id}`);
  verifyLicenseEvidence(locked, license.files[0]!.bytes);
  verifyLockedResourceDigest(locked, resource.id, acquired.digest);
  return acquired.files.map((file) => ({
    path: file.path,
    content: file.bytes,
  }));
}

function renderUiUxSkill(input: {
  readonly platform: "codex" | "claude";
  readonly templates: ReadonlyMap<string, Uint8Array>;
}): Uint8Array {
  const platform = JSON.parse(
    Buffer.from(
      input.templates.get(`templates/platforms/${input.platform}.json`)!,
    ).toString("utf8"),
  ) as {
    folderStructure: { root: string };
    scriptPath: string;
    frontmatter: Record<string, string>;
    title: string;
    description: string;
    skillOrWorkflow: string;
    sections: { quickReference: boolean };
  };
  const frontmatter = [
    "---",
    ...Object.entries(platform.frontmatter).map(
      ([key, value]) =>
        `${key}: ${value.includes(":") || value.includes('"') ? `"${value.replaceAll('"', '\\"')}"` : value}`,
    ),
    "---",
    "",
  ].join("\n");
  const scriptPath =
    `~/${platform.folderStructure.root}/${platform.scriptPath}`.replace(
      /\/{2,}/g,
      "/",
    );
  const quickReference = platform.sections.quickReference
    ? `\n${Buffer.from(input.templates.get("templates/base/quick-reference.md")!).toString("utf8")}`
    : "";
  const body = Buffer.from(
    input.templates.get("templates/base/skill-content.md")!,
  )
    .toString("utf8")
    .replaceAll("{{TITLE}}", platform.title)
    .replaceAll("{{DESCRIPTION}}", platform.description)
    .replaceAll("{{SCRIPT_PATH}}", scriptPath)
    .replaceAll("{{SKILL_OR_WORKFLOW}}", platform.skillOrWorkflow)
    .replaceAll("{{QUICK_REFERENCE}}", quickReference);
  return Buffer.from(frontmatter + body);
}

/** Acquires selected external-managed resources at their immutable locked revisions. */
export async function externalSkillAssets(
  platform: "codex" | "claude",
  client: HttpClient = createHttpsClient(),
): Promise<readonly ExternalSkillAsset[]> {
  const { registry, lock } = await sourceState();
  const [codebase, wayfinder, grillMe, grilling, writing, uiUx] =
    await Promise.all([
      acquireLockedResource({
        client,
        registry,
        lock,
        sourceId: "matt-skills",
        resourceId: "matt-codebase-design",
      }),
      acquireLockedResource({
        client,
        registry,
        lock,
        sourceId: "matt-skills",
        resourceId: "matt-wayfinder",
      }),
      acquireLockedResource({
        client,
        registry,
        lock,
        sourceId: "matt-skills",
        resourceId: "matt-grill-me",
      }),
      acquireLockedResource({
        client,
        registry,
        lock,
        sourceId: "matt-skills",
        resourceId: "matt-grilling",
      }),
      acquireLockedResource({
        client,
        registry,
        lock,
        sourceId: "matt-skills",
        resourceId: "matt-writing-for-agents",
      }),
      acquireLockedResource({
        client,
        registry,
        lock,
        sourceId: "ui-ux-pro-max",
        resourceId: "ui-ux-pro-max-core",
      }),
    ]);
  const templates = new Map(uiUx.map((file) => [file.path, file.content]));
  return [
    { name: "codebase-design", files: codebase },
    { name: "wayfinder", files: wayfinder },
    { name: "grill-me", files: grillMe },
    { name: "grilling", files: grilling },
    { name: "writing-for-agents", files: writing },
    {
      name: "ui-ux-pro-max",
      files: [
        { path: "SKILL.md", content: renderUiUxSkill({ platform, templates }) },
        ...uiUx.filter(
          (file) =>
            file.path.startsWith("data/") || file.path.startsWith("scripts/"),
        ),
      ],
    },
  ];
}
