import {
  chmod,
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { applyInstallPlan } from "../../src/installer/index.js";
import {
  detectCodex,
  planCodexGlobalInstructions,
  resolveCodexPaths,
  verifyCodexGlobalInstructions,
} from "../../src/providers/codex/index.js";
import { readState } from "../../src/state/index.js";

const roots: string[] = [];
const content = "# Test global instructions\n\nFollow the test contract.\n";

async function fixture() {
  const homeDir = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-codex-")),
  );
  roots.push(homeDir);
  const codexHome = join(homeDir, "custom-codex");
  const stateDir = join(homeDir, "state");
  const detected = await detectCodex(
    { homeDir, env: { CODEX_HOME: codexHome } },
    { run: async () => ({ stdout: "codex 1.2.3\n", stderr: "" }) },
  );
  return { homeDir, codexHome, stateDir, detected };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Codex paths and detection", () => {
  it("resolves default and explicit homes without reading process environment", () => {
    expect(resolveCodexPaths({ homeDir: "/tmp/test-home", env: {} }).home).toBe(
      "/tmp/test-home/.codex",
    );
    expect(
      resolveCodexPaths({
        homeDir: "/tmp/test-home",
        env: { CODEX_HOME: "/tmp/custom" },
      }).home,
    ).toBe("/tmp/custom");
    expect(() =>
      resolveCodexPaths({
        homeDir: "/tmp/test-home",
        env: { CODEX_HOME: "./codex" },
      }),
    ).toThrow("absolute");
  });

  it("retains raw version output and distinguishes missing and failed version calls", async () => {
    const context = { homeDir: "/tmp/test-home", env: {} };
    const found = await detectCodex(context, {
      run: async () => ({ stdout: "codex 1.2.3\n", stderr: "note\n" }),
    });
    expect(found).toMatchObject({
      installed: true,
      versionOutput: "codex 1.2.3\nnote\n",
    });
    const missing = await detectCodex(context, {
      run: async () => {
        const error = new Error("missing") as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      },
    });
    expect(missing).toMatchObject({ installed: false });
    const failed = await detectCodex(context, {
      run: async () => {
        throw new Error("exit 2");
      },
    });
    expect(failed).toMatchObject({ installed: false, error: "exit 2" });
  });
});

describe("Codex global instructions", () => {
  it("creates, verifies, updates, and preserves config.toml as external state", async () => {
    const test = await fixture();
    await mkdir(test.codexHome, { recursive: true });
    const config = join(test.codexHome, "config.toml");
    await writeFile(config, 'model = "test"\n');
    await chmod(config, 0o640);
    const before = await readFile(config);
    const beforeMode = (await lstat(config)).mode & 0o777;

    const first = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(first.canApply).toBe(true);
    expect(first.installerPlan?.actions[0]?.kind).toBe("CREATE");
    await applyInstallPlan(
      {
        homeDir: test.codexHome,
        stateDir: test.stateDir,
        allowedTargetRoots: [test.codexHome],
      },
      first.installerPlan!,
    );
    expect(await readFile(test.detected.paths.globalAgents, "utf8")).toBe(
      content,
    );
    expect((await lstat(test.detected.paths.globalAgents)).mode & 0o777).toBe(
      0o644,
    );
    expect(await readFile(config)).toEqual(before);
    expect((await lstat(config)).mode & 0o777).toBe(beforeMode);
    expect(Object.keys((await readState(test.stateDir)).artifacts)).toEqual([
      "codex.global.instructions",
    ]);
    expect(
      (
        await verifyCodexGlobalInstructions({
          detection: test.detected,
          stateDir: test.stateDir,
          content,
        })
      ).status,
    ).toBe("VERIFIED");

    const update = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content: "updated\n",
    });
    expect(update.installerPlan?.actions[0]?.kind).toBe("REPLACE_MANAGED");
    await applyInstallPlan(
      {
        homeDir: test.codexHome,
        stateDir: test.stateDir,
        allowedTargetRoots: [test.codexHome],
      },
      update.installerPlan!,
    );
  });

  it("blocks empty instructions, absent providers, active and unsafe overrides before mutation", async () => {
    const test = await fixture();
    const empty = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content: " \n",
    });
    expect(empty.diagnostics.map((item) => item.kind)).toContain(
      "EMPTY_GLOBAL_INSTRUCTIONS",
    );
    expect(empty.installerPlan).toBeUndefined();
    const unavailable = {
      ...test.detected,
      installed: false,
      executable: undefined,
      versionOutput: undefined,
    };
    const missing = await planCodexGlobalInstructions({
      detection: unavailable,
      stateDir: test.stateDir,
      content,
    });
    expect(missing.diagnostics.map((item) => item.kind)).toContain(
      "CODEX_NOT_DETECTED",
    );
    expect(missing.installerPlan).toBeUndefined();

    await mkdir(test.codexHome, { recursive: true });
    await writeFile(test.detected.paths.globalOverride, "take precedence\n");
    const active = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(active.diagnostics.map((item) => item.kind)).toContain(
      "CODEX_GLOBAL_OVERRIDE_ACTIVE",
    );
    expect(active.installerPlan).toBeUndefined();
    await rm(test.detected.paths.globalOverride);
    await symlink(
      join(test.homeDir, "outside"),
      test.detected.paths.globalOverride,
    );
    const unsafe = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(unsafe.diagnostics.map((item) => item.kind)).toContain(
      "CODEX_GLOBAL_OVERRIDE_UNSAFE",
    );
    await expect(lstat(test.detected.paths.globalAgents)).rejects.toMatchObject(
      { code: "ENOENT" },
    );
  });

  it("allows whitespace-only overrides but leaves them unmanaged", async () => {
    const test = await fixture();
    await mkdir(test.codexHome, { recursive: true });
    await writeFile(test.detected.paths.globalOverride, " \n\t");
    const plan = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(plan.canApply).toBe(true);
    expect(plan.installerPlan?.actions[0]?.kind).toBe("CREATE");
  });

  it("passes Phase 2 ownership conflicts through unchanged", async () => {
    const test = await fixture();
    await mkdir(test.codexHome, { recursive: true });
    await writeFile(test.detected.paths.globalAgents, content);
    const unmanaged = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(unmanaged.installerPlan?.conflicts[0]?.kind).toBe(
      "UNMANAGED_EXISTS",
    );
    await rm(test.detected.paths.globalAgents);
    await symlink(
      join(test.homeDir, "outside"),
      test.detected.paths.globalAgents,
    );
    const symlinked = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(symlinked.installerPlan?.conflicts[0]?.kind).toBe("SYMLINK_TARGET");
  });

  it("rejects an unsafe home and unsupported override without following links", async () => {
    const test = await fixture();
    const alias = join(test.homeDir, "codex-alias");
    await symlink(join(test.homeDir, "outside"), alias);
    const unsafeHome = await detectCodex(
      { homeDir: test.homeDir, env: { CODEX_HOME: alias } },
      { run: async () => ({ stdout: "codex 1\n", stderr: "" }) },
    );
    const homePlan = await planCodexGlobalInstructions({
      detection: unsafeHome,
      stateDir: test.stateDir,
      content,
    });
    expect(homePlan.diagnostics.map((item) => item.kind)).toContain(
      "INVALID_CODEX_HOME",
    );
    await mkdir(test.codexHome, { recursive: true });
    await mkdir(test.detected.paths.globalOverride);
    const overridePlan = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(overridePlan.diagnostics.map((item) => item.kind)).toContain(
      "CODEX_GLOBAL_OVERRIDE_UNSAFE",
    );
  });

  it("reports drift and an added active override during verification without mutation", async () => {
    const test = await fixture();
    const initial = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    await applyInstallPlan(
      {
        homeDir: test.codexHome,
        stateDir: test.stateDir,
        allowedTargetRoots: [test.codexHome],
      },
      initial.installerPlan!,
    );
    await writeFile(test.detected.paths.globalAgents, "local edit\n");
    const drifted = await planCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(drifted.installerPlan?.conflicts[0]?.kind).toBe("MANAGED_DRIFT");
    await writeFile(test.detected.paths.globalOverride, "external override\n");
    const verified = await verifyCodexGlobalInstructions({
      detection: test.detected,
      stateDir: test.stateDir,
      content,
    });
    expect(verified.status).toBe("NOT_VERIFIED");
    expect(verified.plan.diagnostics.map((item) => item.kind)).toContain(
      "CODEX_GLOBAL_OVERRIDE_ACTIVE",
    );
    await expect(lstat(join(test.codexHome, "skills"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
