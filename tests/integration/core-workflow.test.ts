import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { applyInstallPlan, planInstall } from "../../src/installer/index.js";
import {
  detectCodex,
  planCodexCoreWorkflow,
  planCodexNativeSkills,
} from "../../src/providers/codex/index.js";
import { readGlobalAgentContract } from "../../src/standards/index.js";

const roots: string[] = [];

async function fixture() {
  const homeDir = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-core-workflow-")),
  );
  roots.push(homeDir);
  const codexHome = join(homeDir, "codex");
  const stateDir = join(homeDir, "state");
  const detection = await detectCodex(
    { homeDir, env: { CODEX_HOME: codexHome } },
    { run: async () => ({ stdout: "codex test\n", stderr: "" }) },
  );
  return { homeDir, codexHome, stateDir, detection };
}

async function applyCore(test: Awaited<ReturnType<typeof fixture>>) {
  const plan = await planCodexCoreWorkflow({
    detection: test.detection,
    stateDir: test.stateDir,
  });
  await applyInstallPlan(
    {
      homeDir: test.codexHome,
      stateDir: test.stateDir,
      allowedTargetRoots: [test.codexHome],
    },
    plan.globalInstructions.installerPlan!,
  );
  await applyInstallPlan(
    {
      homeDir: dirname(test.detection.paths.userSkillsRoot),
      stateDir: test.stateDir,
      allowedTargetRoots: [dirname(test.detection.paths.userSkillsRoot)],
    },
    plan.nativeSkills.installerPlan!,
  );
  return plan;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Codex core workflow", () => {
  it("installs global instructions and all ten skills in an isolated home, then converges", async () => {
    const test = await fixture();
    await mkdir(test.codexHome, { recursive: true });
    const config = join(test.codexHome, "config.toml");
    await writeFile(config, 'model = "external"\n');
    const initial = await applyCore(test);
    const globalContract = await readGlobalAgentContract();
    expect(initial.canApply).toBe(true);
    expect(initial.nativeSkills.installerPlan?.actions).toHaveLength(20);
    expect(await readFile(test.detection.paths.globalAgents, "utf8")).toBe(
      globalContract,
    );
    expect(await readFile(config, "utf8")).toBe('model = "external"\n');
    for (const name of initial.nativeSkills.catalog.skills.map(
      (skill) => skill.name,
    )) {
      await expect(
        readFile(join(test.detection.paths.userSkillsRoot, name, "SKILL.md")),
      ).resolves.toBeDefined();
      await expect(
        readFile(
          join(
            test.detection.paths.userSkillsRoot,
            name,
            "agents",
            "openai.yaml",
          ),
          "utf8",
        ),
      ).resolves.toContain("allow_implicit_invocation: false");
    }
    const repeat = await planCodexCoreWorkflow({
      detection: test.detection,
      stateDir: test.stateDir,
    });
    expect(repeat.canApply).toBe(true);
    expect(repeat.globalInstructions.installerPlan?.hasChanges).toBe(false);
    expect(repeat.nativeSkills.installerPlan?.hasChanges).toBe(false);
  });

  it("preserves unmanaged skill files and reports metadata drift", async () => {
    const unmanaged = await fixture();
    const unmanagedTarget = join(
      unmanaged.detection.paths.userSkillsRoot,
      "aic-plan",
      "SKILL.md",
    );
    await mkdir(dirname(unmanagedTarget), { recursive: true });
    await writeFile(unmanagedTarget, "external\n");
    const unmanagedPlan = await planCodexNativeSkills({
      detection: unmanaged.detection,
      stateDir: unmanaged.stateDir,
    });
    expect(unmanagedPlan.installerPlan?.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "UNMANAGED_EXISTS" }),
      ]),
    );

    const drifted = await fixture();
    await applyCore(drifted);
    const metadata = join(
      drifted.detection.paths.userSkillsRoot,
      "aic-verify",
      "agents",
      "openai.yaml",
    );
    await writeFile(metadata, "external metadata\n");
    const driftPlan = await planCodexNativeSkills({
      detection: drifted.detection,
      stateDir: drifted.stateDir,
    });
    expect(driftPlan.installerPlan?.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "MANAGED_DRIFT" }),
      ]),
    );
    expect(await readFile(metadata, "utf8")).toBe("external metadata\n");
  });

  it("uses Phase 2 managed replacement semantics for a canonical skill file", async () => {
    const test = await fixture();
    const initial = await applyCore(test);
    const action = initial.nativeSkills.installerPlan!.actions.find(
      (entry) => entry.artifact.id === "codex.user-skill.aic-plan.instructions",
    )!;
    const update = await planInstall(
      {
        homeDir: dirname(test.detection.paths.userSkillsRoot),
        stateDir: test.stateDir,
        allowedTargetRoots: [dirname(test.detection.paths.userSkillsRoot)],
      },
      [
        {
          ...action.artifact,
          content: `${String(action.artifact.content)}\nUpdated canonical content.\n`,
        },
      ],
    );
    expect(update.actions[0]?.kind).toBe("REPLACE_MANAGED");
    await applyInstallPlan(
      {
        homeDir: dirname(test.detection.paths.userSkillsRoot),
        stateDir: test.stateDir,
        allowedTargetRoots: [dirname(test.detection.paths.userSkillsRoot)],
      },
      update,
    );
    expect(await readFile(action.artifact.targetPath, "utf8")).toContain(
      "Updated canonical content.",
    );
  });

  it("makes the whole workflow unavailable when a global override is active", async () => {
    const test = await fixture();
    await mkdir(test.codexHome, { recursive: true });
    await writeFile(test.detection.paths.globalOverride, "owner override\n");
    const plan = await planCodexCoreWorkflow({
      detection: test.detection,
      stateDir: test.stateDir,
    });
    expect(plan.globalInstructions.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "CODEX_GLOBAL_OVERRIDE_ACTIVE" }),
      ]),
    );
    expect(plan.nativeSkills.canApply).toBe(true);
    expect(plan.canApply).toBe(false);
    await expect(
      lstat(test.detection.paths.userSkillsRoot),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
