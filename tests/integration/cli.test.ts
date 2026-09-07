import { existsSync } from "node:fs";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const temporaryHomes: string[] = [];
const entryPoint = new URL("../../dist/cli/index.js", import.meta.url);

afterEach(async () => {
  await Promise.all(
    temporaryHomes
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function fixture() {
  const created = await mkdtemp(join(tmpdir(), "ai-config-cli-"));
  temporaryHomes.push(created);
  const root = await realpath(created);
  const home = join(root, "home");
  const bin = join(root, "bin");
  const codexHome = join(home, ".codex");
  const agents = join(home, ".agents");
  const state = join(home, ".ai-config");
  await mkdir(home);
  await mkdir(bin);
  const codex = join(bin, "codex");
  await writeFile(codex, "#!/bin/sh\nexit 0\n");
  await chmod(codex, 0o755);
  return {
    codexHome,
    agents,
    state,
    globalAgents: join(codexHome, "AGENTS.md"),
    env: {
      ...process.env,
      HOME: home,
      CODEX_HOME: codexHome,
      PATH: `${bin}:${process.env.PATH ?? ""}`,
    },
  };
}

function run(env: NodeJS.ProcessEnv, ...args: string[]) {
  const result = spawnSync(process.execPath, [entryPoint.pathname, ...args], {
    env,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function transactionId(stdout: string): string {
  const id = /APPLIED transaction ([a-f0-9-]+)/.exec(stdout)?.[1];
  if (!id) throw new Error(`Missing transaction identity in: ${stdout}`);
  return id;
}

function approvalFingerprint(stdout: string): string {
  const fingerprint = /APPROVAL_FINGERPRINT ([a-f0-9]{64})/.exec(stdout)?.[1];
  if (!fingerprint)
    throw new Error(`Missing approval fingerprint in: ${stdout}`);
  return fingerprint;
}

async function desiredGlobalContract(): Promise<Buffer> {
  return readFile(
    new URL("../../standards/global-agent-contract.md", import.meta.url),
  );
}

describe("Phase 9 public CLI", () => {
  it("keeps setup preview completely non-mutating", async () => {
    const test = await fixture();
    const preview = run(test.env, "setup", "--provider", "codex");

    expect(preview.status).toBe(0);
    expect(preview.stdout).toContain("CREATE codex.global.instructions");
    expect(existsSync(test.codexHome)).toBe(false);
    expect(existsSync(test.agents)).toBe(false);
    expect(existsSync(test.state)).toBe(false);
  });

  it("applies clean setup, converges to NOOP, and requires an explicit rollback transaction", async () => {
    const test = await fixture();
    const applied = run(test.env, "setup", "--provider", "codex", "--apply");
    const id = transactionId(applied.stdout);

    expect(applied.status).toBe(0);
    expect(existsSync(join(test.state, "state.json"))).toBe(true);
    expect(existsSync(join(test.state, "receipts", `${id}.json`))).toBe(true);
    expect(run(test.env, "setup", "--provider", "codex").stdout).toContain(
      "NOOP already current",
    );

    const missing = run(test.env, "rollback", "--provider", "codex");
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain("rollback requires --transaction");

    const before = await readFile(test.globalAgents);
    const preview = run(
      test.env,
      "rollback",
      "--provider",
      "codex",
      "--transaction",
      id,
    );
    expect(preview.status).toBe(0);
    await expect(readFile(test.globalAgents)).resolves.toEqual(before);

    const rollback = run(
      test.env,
      "rollback",
      "--provider",
      "codex",
      "--transaction",
      id,
      "--apply",
    );
    expect(rollback.status).toBe(0);
    expect(rollback.stdout).toContain(`ROLLED_BACK transaction ${id}`);
    expect(existsSync(test.globalAgents)).toBe(false);
  });

  it("adopts exact content without rewriting it and rollback preserves the original", async () => {
    const test = await fixture();
    const original = await desiredGlobalContract();
    await mkdir(test.codexHome);
    await writeFile(test.globalAgents, original, { mode: 0o644 });
    const before = await stat(test.globalAgents);

    const preview = run(test.env, "setup", "--provider", "codex");
    expect(preview.stdout).toContain("ADOPT codex.global.instructions");
    expect(existsSync(test.state)).toBe(false);

    const applied = run(test.env, "setup", "--provider", "codex", "--apply");
    const id = transactionId(applied.stdout);
    const after = await stat(test.globalAgents);
    const state = JSON.parse(
      await readFile(join(test.state, "state.json"), "utf8"),
    );
    expect(await readFile(test.globalAgents)).toEqual(original);
    expect(after.ino).toBe(before.ino);
    expect(state.artifacts["codex.global.instructions"].ownership).toBe(
      "adopted",
    );

    expect(
      run(
        test.env,
        "rollback",
        "--provider",
        "codex",
        "--transaction",
        id,
        "--apply",
      ).status,
    ).toBe(0);
    expect(await readFile(test.globalAgents)).toEqual(original);
    expect((await stat(test.globalAgents)).ino).toBe(before.ino);
    expect(existsSync(join(test.state, "state.json"))).toBe(false);
  });

  it("requires exact authorization to replace one unmanaged conflict and rolls it back exactly", async () => {
    const test = await fixture();
    const legacy = Buffer.from("legacy OMX contract\n");
    await mkdir(test.codexHome);
    await writeFile(test.globalAgents, legacy, { mode: 0o600 });

    const conflict = run(test.env, "setup", "--provider", "codex");
    expect(conflict.status).not.toBe(0);
    expect(conflict.stdout).toContain("CONFLICT codex.global.instructions");
    expect(existsSync(test.state)).toBe(false);
    const conflictDoctor = run(test.env, "doctor", "--provider", "codex");
    expect(conflictDoctor.status).not.toBe(0);
    expect(conflictDoctor.stdout).toContain(
      "CONFLICT codex.global.instructions",
    );

    const authorizedPreview = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
    );
    expect(authorizedPreview.status).toBe(0);
    expect(authorizedPreview.stdout).toContain(
      "REPLACE_UNMANAGED_APPROVED codex.global.instructions",
    );
    const fingerprint = approvalFingerprint(authorizedPreview.stdout);
    expect(await readFile(test.globalAgents)).toEqual(legacy);
    expect(existsSync(test.state)).toBe(false);

    const applied = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
      "--approve-preview",
      fingerprint,
      "--apply",
    );
    const id = transactionId(applied.stdout);
    const receipt = JSON.parse(
      await readFile(join(test.state, "receipts", `${id}.json`), "utf8"),
    );
    const replacement = receipt.actions.find(
      (action: { artifactId: string }) =>
        action.artifactId === "codex.global.instructions",
    );
    expect(await readFile(test.globalAgents)).toEqual(
      await desiredGlobalContract(),
    );
    expect((await stat(test.globalAgents)).mode & 0o777).toBe(0o644);
    expect(
      JSON.parse(await readFile(join(test.state, "state.json"), "utf8"))
        .artifacts["codex.global.instructions"].ownership,
    ).toBe("managed");
    expect(
      await readFile(join(test.state, "backups", id, replacement.backupFile)),
    ).toEqual(legacy);

    const doctor = run(test.env, "doctor", "--provider", "codex");
    expect(doctor.status).toBe(0);
    expect(doctor.stdout).toContain("codex: NOOP already current");

    const rollback = run(
      test.env,
      "rollback",
      "--provider",
      "codex",
      "--transaction",
      id,
      "--apply",
    );
    expect(rollback.status).toBe(0);
    expect(await readFile(test.globalAgents)).toEqual(legacy);
    expect((await stat(test.globalAgents)).mode & 0o777).toBe(0o600);
    expect(existsSync(join(test.state, "state.json"))).toBe(false);
  });

  it("rejects a prior approval fingerprint when target bytes change without mutation", async () => {
    const test = await fixture();
    await mkdir(test.codexHome);
    await writeFile(test.globalAgents, "legacy A\n", { mode: 0o600 });
    const preview = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
    );
    const fingerprint = approvalFingerprint(preview.stdout);

    await writeFile(test.globalAgents, "legacy B\n");
    const applied = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
      "--approve-preview",
      fingerprint,
      "--apply",
    );
    expect(applied.status).not.toBe(0);
    expect(applied.stderr).toContain("PREVIEW_CHANGED");
    expect(await readFile(test.globalAgents, "utf8")).toBe("legacy B\n");
    expect(existsSync(test.state)).toBe(false);
  });

  it("rejects a prior approval fingerprint when target mode changes", async () => {
    const test = await fixture();
    await mkdir(test.codexHome);
    await writeFile(test.globalAgents, "legacy\n", { mode: 0o600 });
    const preview = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
    );
    const fingerprint = approvalFingerprint(preview.stdout);

    await chmod(test.globalAgents, 0o640);
    const applied = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
      "--approve-preview",
      fingerprint,
      "--apply",
    );
    expect(applied.status).not.toBe(0);
    expect(applied.stderr).toContain("PREVIEW_CHANGED");
    expect((await stat(test.globalAgents)).mode & 0o777).toBe(0o640);
    expect(existsSync(test.state)).toBe(false);
  });

  it("rejects wrong fingerprints and changed replacement authorization sets", async () => {
    const test = await fixture();
    await mkdir(test.codexHome);
    await writeFile(test.globalAgents, "legacy\n", { mode: 0o600 });
    const preview = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
    );
    const fingerprint = approvalFingerprint(preview.stdout);

    const wrong = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
      "--approve-preview",
      "0".repeat(64),
      "--apply",
    );
    expect(wrong.status).not.toBe(0);
    expect(wrong.stderr).toContain("PREVIEW_CHANGED");

    const changedSet = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
      "--replace-conflict",
      "codex.user-skill.aic-analyze.instructions",
      "--approve-preview",
      fingerprint,
      "--apply",
    );
    expect(changedSet.status).not.toBe(0);
    expect(changedSet.stderr).toContain("PREVIEW_CHANGED");
    expect(await readFile(test.globalAgents, "utf8")).toBe("legacy\n");
    expect(existsSync(test.state)).toBe(false);
  });

  it("validates approve-preview CLI combinations", async () => {
    const test = await fixture();
    const valid = "a".repeat(64);
    const cases = [
      [
        "setup",
        "--provider",
        "codex",
        "--replace-conflict",
        "codex.global.instructions",
        "--approve-preview",
        valid,
      ],
      ["setup", "--provider", "codex", "--approve-preview", valid, "--apply"],
      [
        "setup",
        "--provider",
        "codex",
        "--replace-conflict",
        "codex.global.instructions",
        "--approve-preview",
        "BAD",
        "--apply",
      ],
      [
        "setup",
        "--provider",
        "codex",
        "--replace-conflict",
        "codex.global.instructions",
        "--approve-preview",
        valid,
        "--approve-preview",
        valid,
        "--apply",
      ],
    ];
    for (const args of cases) expect(run(test.env, ...args).status).not.toBe(0);
    expect(existsSync(test.state)).toBe(false);
    expect(existsSync(test.codexHome)).toBe(false);
  });

  it("does not let authorization for artifact A cover conflicting artifact B", async () => {
    const test = await fixture();
    const skill = join(test.agents, "skills", "aic-analyze", "SKILL.md");
    await mkdir(test.codexHome);
    await writeFile(test.globalAgents, "legacy\n", { mode: 0o600 });
    await mkdir(join(test.agents, "skills", "aic-analyze"), {
      recursive: true,
    });
    await writeFile(skill, "different skill\n", { mode: 0o644 });

    const result = run(
      test.env,
      "setup",
      "--provider",
      "codex",
      "--replace-conflict",
      "codex.global.instructions",
    );
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(
      "CONFLICT codex.user-skill.aic-analyze.instructions",
    );
    expect(await readFile(test.globalAgents, "utf8")).toBe("legacy\n");
    expect(await readFile(skill, "utf8")).toBe("different skill\n");
    expect(existsSync(test.state)).toBe(false);
  });

  it("doctor reports managed drift and recovery-required evidence", async () => {
    const test = await fixture();
    expect(
      run(test.env, "setup", "--provider", "codex", "--apply").status,
    ).toBe(0);
    await writeFile(test.globalAgents, "drift\n");
    const drift = run(test.env, "doctor", "--provider", "codex");
    expect(drift.status).not.toBe(0);
    expect(drift.stdout).toContain("MANAGED_DRIFT");

    await writeFile(join(test.state, "receipts", "unexpected.json"), "{}\n");
    const recovery = run(test.env, "doctor", "--provider", "codex");
    expect(recovery.status).not.toBe(0);
    expect(recovery.stdout).toContain("RECOVERY_REQUIRED");
  });
});
