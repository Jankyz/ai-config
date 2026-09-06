import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  classifyProjectScaffold,
  projectTemplateAssetPaths,
  projectTemplatePaths,
  resolveProjectRoot,
  validateProjectTemplates,
} from "../../src/templates/index.js";

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "ai-config-project-bootstrap-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("project bootstrap templates", () => {
  it("contains all approved, safe canonical template assets", async () => {
    expect(projectTemplateAssetPaths).toEqual([
      "README.md",
      "AGENTS.md",
      "CONTEXT.md",
      "ARCHITECTURE.md",
      "DESIGN.md",
      "docs/README.md",
    ]);
    expect(projectTemplatePaths).toHaveLength(5);
    await expect(validateProjectTemplates()).resolves.toEqual({
      valid: true,
      errors: [],
    });
  });

  it("classifies a new repository without assuming UI relevance", async () => {
    const scaffold = await classifyProjectScaffold(await fixture());
    expect(scaffold).toEqual({
      "AGENTS.md": "CREATE",
      "CONTEXT.md": "CREATE",
      "ARCHITECTURE.md": "CREATE",
      "DESIGN.md": "SKIP",
      "docs/README.md": "CREATE",
    });
  });

  it("canonicalizes a project root reached through an alias", async () => {
    const root = await fixture();
    const aliasParent = await fixture();
    const alias = join(aliasParent, "project-alias");
    await symlink(root, alias);
    await expect(resolveProjectRoot(alias)).resolves.toBe(await realpath(root));
    await expect(classifyProjectScaffold(alias)).resolves.toMatchObject({
      "AGENTS.md": "CREATE",
      "docs/README.md": "CREATE",
    });
  });

  it("preserves regular project documents and creates a requested design scaffold", async () => {
    const root = await fixture();
    await writeFile(join(root, "AGENTS.md"), "existing project instructions\n");
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "README.md"), "existing docs map\n");
    const scaffold = await classifyProjectScaffold(root, {
      includeDesign: true,
    });
    expect(scaffold["AGENTS.md"]).toBe("PRESERVE");
    expect(scaffold["docs/README.md"]).toBe("PRESERVE");
    expect(scaffold["CONTEXT.md"]).toBe("CREATE");
    expect(scaffold["ARCHITECTURE.md"]).toBe("CREATE");
    expect(scaffold["DESIGN.md"]).toBe("CREATE");
  });

  it("reports unsafe structural paths as conflicts", async () => {
    const root = await fixture();
    await writeFile(join(root, "outside"), "outside\n");
    await symlink(join(root, "outside"), join(root, "CONTEXT.md"));
    const scaffold = await classifyProjectScaffold(root);
    expect(scaffold["CONTEXT.md"]).toBe("CONFLICT");
  });

  it("does not traverse a symlinked docs directory", async () => {
    const root = await fixture();
    const outside = await fixture();
    await symlink(outside, join(root, "docs"));
    const scaffold = await classifyProjectScaffold(root);
    expect(scaffold["docs/README.md"]).toBe("CONFLICT");
  });
});
