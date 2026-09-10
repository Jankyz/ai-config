import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("package contents", () => {
  it("includes the public runtime assets and excludes development material", async () => {
    const cache = await mkdtemp(join(tmpdir(), "ai-config-pack-cache-"));
    roots.push(cache);
    const output = execFileSync(
      "npm",
      ["pack", "--dry-run", "--json", "--ignore-scripts", "--cache", cache],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    const packed = JSON.parse(output) as Array<{
      name: string;
      files: Array<{ path: string }>;
    }>;
    expect(packed[0]?.name).toBe("@jankyz/ai-config");
    const paths = packed[0]?.files.map((file) => file.path) ?? [];
    expect(paths).toEqual(
      expect.arrayContaining([
        "bin/ai-config",
        "dist/cli/index.js",
        "dist/core/orchestration.js",
        "dist/providers/codex/index.js",
        "dist/skills/catalog.js",
        "dist/standards/index.js",
        "dist/templates/index.js",
        "skills/aic-plan/SKILL.md",
        "skills/aic-product-design-lead/SKILL.md",
        "skills/aic-tdd/SKILL.md",
        "skills/aic-domain-modeling/SKILL.md",
        "skills/aic-shadcn/SKILL.md",
        "skills/aic-ui-components/SKILL.md",
        "skills/aic-ui-generate/SKILL.md",
        "standards/global-agent-contract.md",
        "templates/project/AGENTS.md",
        "templates/project/CONTEXT.md",
        "templates/project/ARCHITECTURE.md",
        "templates/project/DESIGN.md",
        "templates/project/docs/README.md",
        "upstream/registry.json",
        "upstream/lock.json",
        "THIRD_PARTY_NOTICES.md",
        "third_party/21st/LICENSE",
        "third_party/matt/LICENSE",
        "third_party/shadcn/LICENSE",
        "third_party/ui-ux-pro-max/LICENSE",
      ]),
    );
    for (const prefix of [
      "tests/",
      "docs/plans/",
      "node_modules/",
      "third_party/matt/skills/",
      "third_party/ui-ux-pro-max/src/",
      "third_party/shadcn/skill/",
      "third_party/21st/1.17.0/package/",
      ".npm-cache/",
      ".ai-config/",
    ])
      expect(paths.some((path) => path.startsWith(prefix))).toBe(false);
    expect(paths).not.toContain("third_party/21st/NOTICE");
    expect(paths.some((path) => path.endsWith(".tgz"))).toBe(false);
    expect(
      paths.some((path) => /(^|\/)(?:\.env|credentials?)(?:\.|$)/i.test(path)),
    ).toBe(false);
  });
});
