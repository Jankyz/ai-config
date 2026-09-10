import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { applyInstallPlan } from "../../src/installer/index.js";
import {
  detectCodex,
  planCodexNativeSkills,
} from "../../src/providers/codex/index.js";
import { phase91DependencyClient } from "../fixtures/phase91-dependency-client.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("external-managed skills", () => {
  it("acquires verified fixture resources before installing provider files", async () => {
    const homeDir = await realpath(
      await mkdtemp(join(tmpdir(), "ai-config-external-skills-")),
    );
    roots.push(homeDir);
    const detection = await detectCodex(
      { homeDir, env: { CODEX_HOME: join(homeDir, "codex") } },
      { run: async () => ({ stdout: "codex test\n", stderr: "" }) },
    );
    const client = await phase91DependencyClient();
    const plan = await planCodexNativeSkills({
      detection,
      stateDir: join(homeDir, "state"),
      dependencyClient: client,
    });
    expect(plan.externalSkillNames).toEqual([
      "codebase-design",
      "wayfinder",
      "grill-me",
      "grilling",
      "writing-for-agents",
      "ui-ux-pro-max",
    ]);
    expect(plan.canApply).toBe(true);
    await applyInstallPlan(
      {
        homeDir: dirname(detection.paths.userSkillsRoot),
        stateDir: join(homeDir, "state"),
        allowedTargetRoots: [dirname(detection.paths.userSkillsRoot)],
      },
      plan.installerPlan!,
    );
    await expect(
      readFile(
        join(detection.paths.userSkillsRoot, "codebase-design", "SKILL.md"),
        "utf8",
      ),
    ).resolves.toContain("Codebase Design");
    await expect(
      readFile(
        join(detection.paths.userSkillsRoot, "wayfinder", "SKILL.md"),
        "utf8",
      ),
    ).resolves.toContain("Wayfinding");
    await expect(
      readFile(
        join(detection.paths.userSkillsRoot, "grill-me", "SKILL.md"),
        "utf8",
      ),
    ).resolves.toContain('Call the Skill tool with "grilling"');
    await expect(
      readFile(
        join(detection.paths.userSkillsRoot, "grilling", "SKILL.md"),
        "utf8",
      ),
    ).resolves.toContain("Interview the user relentlessly");
    await expect(
      readFile(
        join(detection.paths.userSkillsRoot, "writing-for-agents", "SKILL.md"),
        "utf8",
      ),
    ).resolves.toContain("Writing documents");
    await expect(
      readFile(
        join(
          detection.paths.userSkillsRoot,
          "ui-ux-pro-max",
          "scripts",
          "search.py",
        ),
        "utf8",
      ),
    ).resolves.toContain("UI/UX Pro Max Search");
  }, 20_000);
});
