import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { applyInstallPlan } from "../../src/installer/index.js";
import {
  detectClaude,
  planClaudeGlobalInstructions,
  renderClaudeSkillMarkdown,
  resolveClaudePaths,
  verifyClaudeCoreWorkflow,
} from "../../src/providers/claude/index.js";
import { readGlobalAgentContract } from "../../src/standards/index.js";
import { readState } from "../../src/state/index.js";

const roots: string[] = [];

async function fixture() {
  const homeDir = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-claude-")),
  );
  roots.push(homeDir);
  const stateDir = join(homeDir, "state");
  const detection = await detectClaude(
    { homeDir, env: {} },
    { run: async () => ({ stdout: "claude 1.2.3\n", stderr: "" }) },
  );
  return { homeDir, stateDir, detection };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Claude paths and detection", () => {
  it("resolves only the default root or an explicit equivalent root", () => {
    expect(
      resolveClaudePaths({ homeDir: "/tmp/test-home", env: {} }).home,
    ).toBe("/tmp/test-home/.claude");
    expect(
      resolveClaudePaths({
        homeDir: "/tmp/test-home",
        env: { CLAUDE_CONFIG_DIR: "/tmp/test-home/.claude" },
      }).usesCustomConfigDir,
    ).toBe(false);
    expect(
      resolveClaudePaths({
        homeDir: "/tmp/test-home",
        env: { CLAUDE_CONFIG_DIR: "/tmp/other-claude" },
      }).usesCustomConfigDir,
    ).toBe(true);
    expect(() =>
      resolveClaudePaths({
        homeDir: "/tmp/test-home",
        env: { CLAUDE_CONFIG_DIR: "relative-claude" },
      }),
    ).toThrow("absolute");
    expect(() =>
      resolveClaudePaths({
        homeDir: "/tmp/test-home",
        env: { CLAUDE_CONFIG_DIR: "   " },
      }),
    ).toThrow("absolute");
    expect(() =>
      resolveClaudePaths({
        homeDir: "/tmp/test-home",
        env: { CLAUDE_CONFIG_DIR: " /tmp/example " },
      }),
    ).toThrow("absolute");
  });

  it("retains raw version output and distinguishes missing and failed version calls", async () => {
    const context = { homeDir: "/tmp/test-home", env: {} };
    await expect(
      detectClaude(context, {
        run: async () => ({ stdout: "claude 1.2.3\n", stderr: "note\n" }),
      }),
    ).resolves.toMatchObject({
      installed: true,
      versionOutput: "claude 1.2.3\nnote\n",
    });
    const missing = await detectClaude(context, {
      run: async () => {
        const error = new Error("missing") as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      },
    });
    expect(missing).toMatchObject({ installed: false });
    await expect(
      detectClaude(context, {
        run: async () => Promise.reject(new Error("exit 2")),
      }),
    ).resolves.toMatchObject({ installed: false, error: "exit 2" });
  });
});

describe("Claude SKILL.md rendering", () => {
  const canonical =
    "---\nname: aic-test\ndescription: Test skill\n---\nBody bytes remain unchanged.\n";

  it("adds exactly one manual-only field without changing the body", () => {
    const rendered = renderClaudeSkillMarkdown(canonical);
    expect(rendered.match(/^disable-model-invocation: true$/gm)).toHaveLength(
      1,
    );
    expect(rendered.replace("disable-model-invocation: true\n", "")).toBe(
      canonical,
    );
  });

  it.each(["false", "true"])(
    "rejects canonical disable-model-invocation: %s metadata",
    (value) => {
      expect(() =>
        renderClaudeSkillMarkdown(
          canonical.replace(
            "---\nBody",
            `disable-model-invocation: ${value}\n---\nBody`,
          ),
        ),
      ).toThrow("must not contain Claude disable-model-invocation metadata");
    },
  );
});

describe("Claude global instructions", () => {
  it("creates, updates, and preserves settings as external state", async () => {
    const test = await fixture();
    await mkdir(test.detection.paths.home, { recursive: true });
    await writeFile(test.detection.paths.settingsJson, '{"theme":"dark"}\n');
    await chmod(test.detection.paths.settingsJson, 0o640);
    const before = await readFile(test.detection.paths.settingsJson);
    const beforeMode =
      (await lstat(test.detection.paths.settingsJson)).mode & 0o777;
    const content = await readGlobalAgentContract();

    const initial = await planClaudeGlobalInstructions({
      detection: test.detection,
      stateDir: test.stateDir,
      content,
    });
    expect(initial.installerPlan?.actions[0]?.kind).toBe("CREATE");
    await applyInstallPlan(
      {
        homeDir: test.detection.paths.home,
        stateDir: test.stateDir,
        allowedTargetRoots: [test.detection.paths.home],
      },
      initial.installerPlan!,
    );
    expect(await readFile(test.detection.paths.globalClaude, "utf8")).toBe(
      content,
    );
    expect((await lstat(test.detection.paths.globalClaude)).mode & 0o777).toBe(
      0o644,
    );
    expect(await readFile(test.detection.paths.settingsJson)).toEqual(before);
    expect((await lstat(test.detection.paths.settingsJson)).mode & 0o777).toBe(
      beforeMode,
    );
    expect(Object.keys((await readState(test.stateDir)).artifacts)).toEqual([
      "claude.global.instructions",
    ]);

    const update = await planClaudeGlobalInstructions({
      detection: test.detection,
      stateDir: test.stateDir,
      content: "updated\n",
    });
    expect(update.installerPlan?.actions[0]?.kind).toBe("REPLACE_MANAGED");
    await applyInstallPlan(
      {
        homeDir: test.detection.paths.home,
        stateDir: test.stateDir,
        allowedTargetRoots: [test.detection.paths.home],
      },
      update.installerPlan!,
    );
    expect(await readFile(test.detection.paths.globalClaude, "utf8")).toBe(
      "updated\n",
    );
    await expect(
      planClaudeGlobalInstructions({
        detection: test.detection,
        stateDir: test.stateDir,
        content: "updated\n",
      }),
    ).resolves.toMatchObject({
      installerPlan: expect.objectContaining({ hasChanges: false }),
    });
  });

  it("blocks custom roots, unavailable providers, empty content, unsafe roots, and unmanaged state", async () => {
    const test = await fixture();
    const content = await readGlobalAgentContract();
    const empty = await planClaudeGlobalInstructions({
      detection: test.detection,
      stateDir: test.stateDir,
      content: " \n",
    });
    expect(empty.installerPlan).toBeUndefined();
    expect(empty.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "EMPTY_GLOBAL_INSTRUCTIONS" }),
      ]),
    );
    const missing = await planClaudeGlobalInstructions({
      detection: { ...test.detection, installed: false },
      stateDir: test.stateDir,
      content,
    });
    expect(missing.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "CLAUDE_NOT_DETECTED" }),
      ]),
    );
    const custom = await detectClaude(
      {
        homeDir: test.homeDir,
        env: { CLAUDE_CONFIG_DIR: join(test.homeDir, "custom-claude") },
      },
      { run: async () => ({ stdout: "claude\n", stderr: "" }) },
    );
    const customPlan = await planClaudeGlobalInstructions({
      detection: custom,
      stateDir: test.stateDir,
      content,
    });
    expect(customPlan.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "CLAUDE_CUSTOM_CONFIG_DIR_UNVERIFIED",
        }),
      ]),
    );
    await mkdir(test.detection.paths.home, { recursive: true });
    await writeFile(test.detection.paths.globalClaude, "unmanaged\n");
    const unmanaged = await planClaudeGlobalInstructions({
      detection: test.detection,
      stateDir: test.stateDir,
      content,
    });
    expect(unmanaged.installerPlan?.conflicts[0]?.kind).toBe(
      "UNMANAGED_EXISTS",
    );
    await rm(test.detection.paths.globalClaude);
    await symlink(
      join(test.homeDir, "outside"),
      test.detection.paths.globalClaude,
    );
    const symlinked = await planClaudeGlobalInstructions({
      detection: test.detection,
      stateDir: test.stateDir,
      content,
    });
    expect(symlinked.installerPlan?.conflicts[0]?.kind).toBe("SYMLINK_TARGET");

    const unsafeRoot = join(test.homeDir, "claude-alias");
    await symlink(join(test.homeDir, "outside"), unsafeRoot);
    const unsafeDetection = await detectClaude(
      { homeDir: test.homeDir, env: { CLAUDE_CONFIG_DIR: unsafeRoot } },
      { run: async () => ({ stdout: "claude\n", stderr: "" }) },
    );
    const unsafePlan = await planClaudeGlobalInstructions({
      detection: unsafeDetection,
      stateDir: test.stateDir,
      content,
    });
    expect(unsafePlan.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "INVALID_CLAUDE_CONFIG_DIR" }),
      ]),
    );
  });

  it("reports managed drift through whole-environment verification", async () => {
    const test = await fixture();
    const content = await readGlobalAgentContract();
    const initial = await planClaudeGlobalInstructions({
      detection: test.detection,
      stateDir: test.stateDir,
      content,
    });
    await applyInstallPlan(
      {
        homeDir: test.detection.paths.home,
        stateDir: test.stateDir,
        allowedTargetRoots: [test.detection.paths.home],
      },
      initial.installerPlan!,
    );
    await writeFile(test.detection.paths.globalClaude, "local edit\n");
    await expect(
      verifyClaudeCoreWorkflow({
        detection: test.detection,
        stateDir: test.stateDir,
      }),
    ).resolves.toMatchObject({ status: "NOT_VERIFIED" });
  });
});
