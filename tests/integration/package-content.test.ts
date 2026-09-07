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
  it("includes the project templates but excludes tests and plans", async () => {
    const cache = await mkdtemp(join(tmpdir(), "ai-config-pack-cache-"));
    roots.push(cache);
    const output = execFileSync(
      "npm",
      ["pack", "--dry-run", "--json", "--ignore-scripts", "--cache", cache],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    const packed = JSON.parse(output) as Array<{
      files: Array<{ path: string }>;
    }>;
    const paths = packed[0]?.files.map((file) => file.path) ?? [];
    expect(paths).toEqual(
      expect.arrayContaining([
        "templates/project/AGENTS.md",
        "templates/project/CONTEXT.md",
        "templates/project/ARCHITECTURE.md",
        "templates/project/DESIGN.md",
        "templates/project/docs/README.md",
        "upstream/registry.json",
        "upstream/lock.json",
        "THIRD_PARTY_NOTICES.md",
        "third_party/21st/LICENSE",
      ]),
    );
    expect(paths.some((path) => path.startsWith("tests/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("docs/plans/"))).toBe(false);
    expect(paths).not.toContain("third_party/21st/NOTICE");
  });
});
