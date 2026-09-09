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
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { applyInstallPlan, planInstall } from "../../src/installer/index.js";
import {
  detectClaude,
  planClaudeCoreWorkflow,
  planClaudeNativeSkills,
  renderClaudeSkillMarkdown,
  verifyClaudeCoreWorkflow,
} from "../../src/providers/claude/index.js";
import { readGlobalAgentContract } from "../../src/standards/index.js";
import {
  projectTemplatePaths,
  projectTemplateRoot,
} from "../../src/templates/index.js";

const roots: string[] = [];

async function fixture() {
  const homeDir = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-claude-workflow-")),
  );
  roots.push(homeDir);
  const stateDir = join(homeDir, "state");
  const detection = await detectClaude(
    { homeDir, env: {} },
    { run: async () => ({ stdout: "claude test\n", stderr: "" }) },
  );
  return { homeDir, stateDir, detection };
}

async function applyCore(test: Awaited<ReturnType<typeof fixture>>) {
  const plan = await planClaudeCoreWorkflow({
    detection: test.detection,
    stateDir: test.stateDir,
    skipExternal: true,
  });
  const context = {
    homeDir: test.detection.paths.home,
    stateDir: test.stateDir,
    allowedTargetRoots: [test.detection.paths.home],
  };
  await applyInstallPlan(context, plan.globalInstructions.installerPlan!);
  await applyInstallPlan(context, plan.nativeSkills.installerPlan!);
  return plan;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Claude core workflow", () => {
  it("installs the global contract and all canonical Claude skills in an isolated home", async () => {
    const test = await fixture();
    await mkdir(test.detection.paths.home, { recursive: true });
    await writeFile(test.detection.paths.settingsJson, '{"external":true}\n');
    const initial = await applyCore(test);
    const globalContract = await readGlobalAgentContract();

    expect(initial.canApply).toBe(true);
    expect(initial.nativeSkills.catalog.skills).toHaveLength(18);
    expect(initial.nativeSkills.externalSkillNames).toEqual([]);
    expect(initial.nativeSkills.installerPlan!.actions.length).toBeGreaterThan(
      30,
    );
    expect(await readFile(test.detection.paths.globalClaude, "utf8")).toBe(
      globalContract,
    );
    expect(await readFile(test.detection.paths.settingsJson, "utf8")).toBe(
      '{"external":true}\n',
    );

    for (const skill of initial.nativeSkills.catalog.skills) {
      const installedPath = join(
        test.detection.paths.userSkillsRoot,
        skill.name,
        "SKILL.md",
      );
      const installed = await readFile(installedPath, "utf8");
      expect(installed).toBe(renderClaudeSkillMarkdown(skill.skillMarkdown));
      expect(installed).toContain(`name: ${skill.name}`);
      expect(installed).toContain("disable-model-invocation: true");
      expect(installed.replace("disable-model-invocation: true\n", "")).toBe(
        skill.skillMarkdown,
      );
      await expect(
        lstat(
          join(
            test.detection.paths.userSkillsRoot,
            skill.name,
            "agents",
            "openai.yaml",
          ),
        ),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }
    for (const path of projectTemplatePaths) {
      const target = join(
        test.detection.paths.userSkillsRoot,
        "aic-bootstrap-project",
        "assets",
        "project",
        path,
      );
      await expect(readFile(target)).resolves.toEqual(
        await readFile(join(projectTemplateRoot(), path)),
      );
    }
    await expect(
      verifyClaudeCoreWorkflow({
        detection: test.detection,
        stateDir: test.stateDir,
        skipExternal: true,
      }),
    ).resolves.toMatchObject({ status: "VERIFIED" });
  });

  it("preserves unmanaged and drifted Claude skills and converges on repeated planning", async () => {
    const unmanaged = await fixture();
    const unmanagedTarget = join(
      unmanaged.detection.paths.userSkillsRoot,
      "aic-plan",
      "SKILL.md",
    );
    await mkdir(join(unmanaged.detection.paths.userSkillsRoot, "aic-plan"), {
      recursive: true,
    });
    await writeFile(unmanagedTarget, "external skill\n");
    const unmanagedPlan = await planClaudeNativeSkills({
      detection: unmanaged.detection,
      stateDir: unmanaged.stateDir,
      skipExternal: true,
    });
    expect(unmanagedPlan.installerPlan?.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "UNMANAGED_EXISTS",
          targetPath: unmanagedTarget,
        }),
      ]),
    );

    const drifted = await fixture();
    const initial = await applyCore(drifted);
    const target = join(
      drifted.detection.paths.userSkillsRoot,
      "aic-verify",
      "SKILL.md",
    );
    await writeFile(target, "local skill edit\n");
    const driftPlan = await planClaudeNativeSkills({
      detection: drifted.detection,
      stateDir: drifted.stateDir,
      skipExternal: true,
    });
    expect(driftPlan.installerPlan?.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "MANAGED_DRIFT", targetPath: target }),
      ]),
    );
    expect(await readFile(target, "utf8")).toBe("local skill edit\n");

    const action = initial.nativeSkills.installerPlan!.actions.find(
      (entry) =>
        entry.artifact.id === "claude.user-skill.aic-plan.instructions",
    )!;
    const update = await planInstall(
      {
        homeDir: drifted.detection.paths.home,
        stateDir: drifted.stateDir,
        allowedTargetRoots: [drifted.detection.paths.home],
      },
      [
        {
          ...action.artifact,
          content: `${String(action.artifact.content)}Updated\n`,
        },
      ],
    );
    expect(update.actions[0]?.kind).toBe("REPLACE_MANAGED");
    await applyInstallPlan(
      {
        homeDir: drifted.detection.paths.home,
        stateDir: drifted.stateDir,
        allowedTargetRoots: [drifted.detection.paths.home],
      },
      update,
    );
    const converged = await planInstall(
      {
        homeDir: drifted.detection.paths.home,
        stateDir: drifted.stateDir,
        allowedTargetRoots: [drifted.detection.paths.home],
      },
      [
        {
          ...action.artifact,
          content: `${String(action.artifact.content)}Updated\n`,
        },
      ],
    );
    expect(converged.actions[0]?.kind).toBe("NOOP");

    const repeat = await planClaudeCoreWorkflow({
      detection: unmanaged.detection,
      stateDir: unmanaged.stateDir,
      skipExternal: true,
    });
    expect(repeat.nativeSkills.installerPlan?.conflicts).toHaveLength(1);
  });
});
