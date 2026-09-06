import { randomUUID } from "node:crypto";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";
import type {
  DesiredArtifact,
  InstallerContext,
  InstallerState,
  TransactionReceipt,
} from "../../src/core/installer.js";
import {
  applyInstallPlan,
  hashContent,
  planInstall,
} from "../../src/installer/index.js";
import { atomicWrite } from "../../src/installer/filesystem.js";
import { atomicJsonWrite, readState } from "../../src/state/index.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, link: vi.fn(actual.link) };
});
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: vi.fn(actual.randomUUID) };
});

const homes: string[] = [];

it("rejects unnormalized direct JSON write paths without traversing symlink aliases", async () => {
  const t = await fixture();
  await mkdir(t.stateDir);
  const outside = join(t.home, "outside");
  await mkdir(join(outside, "nested"), { recursive: true });
  const alias = join(t.stateDir, "alias");
  await symlink(join(outside, "nested"), alias);
  await expect(
    atomicJsonWrite(t.stateDir, `${alias}/../file`, {}),
  ).rejects.toMatchObject({ kind: "STATE_INVALID" });
  await absent(join(outside, "file"));
  await absent(join(t.stateDir, "file"));
});
afterEach(async () => {
  vi.resetAllMocks();
  await Promise.all(
    homes.splice(0).map((home) => rm(home, { recursive: true, force: true })),
  );
});

async function fixture() {
  const home = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-correction-")),
  );
  homes.push(home);
  const root = join(home, "targets");
  const stateDir = join(home, "state");
  const context: InstallerContext = {
    homeDir: home,
    stateDir,
    allowedTargetRoots: [root],
  };
  const artifact = (
    id = "fixture.alpha",
    content = "old",
    mode?: number,
  ): DesiredArtifact => ({
    id,
    targetPath: join(root, id),
    ownership: "managed",
    content,
    ...(mode === undefined ? {} : { mode }),
  });
  const install = async (desired: readonly DesiredArtifact[]) =>
    applyInstallPlan(context, await planInstall(context, desired));
  return { home, root, stateDir, context, artifact, install };
}
async function writeStateFixture(stateDir: string, state: InstallerState) {
  await writeFile(join(stateDir, "state.json"), JSON.stringify(state));
}
async function storedReceipt(
  stateDir: string,
  id: string,
): Promise<TransactionReceipt> {
  return JSON.parse(
    await readFile(join(stateDir, "receipts", `${id}.json`), "utf8"),
  );
}
async function absent(path: string) {
  await expect(lstat(path)).rejects.toMatchObject({ code: "ENOENT" });
}

it("records newly requested mode ownership even when physical mode is unchanged", async () => {
  const t = await fixture();
  const old = t.artifact();
  await t.install([old]);
  const plan = await planInstall(t.context, [{ ...old, mode: 0o644 }]);
  expect(plan.actions[0]?.kind).toBe("REPLACE_MANAGED");
  await applyInstallPlan(t.context, plan);
  expect((await readState(t.stateDir)).artifacts[old.id]?.mode).toBe(0o644);
  await chmod(old.targetPath, 0o600);
  expect((await planInstall(t.context, [old])).conflicts[0]?.kind).toBe(
    "MANAGED_DRIFT",
  );
});

it("restores prior state when committed receipt rename fails", async () => {
  const t = await fixture();
  const old = t.artifact();
  await t.install([old]);
  const stateBefore = await readFile(join(t.stateDir, "state.json"));
  const plan = await planInstall(t.context, [{ ...old, content: "new" }]);
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.spyOn(fs, "rename").mockImplementation(async (source, target) => {
    if (
      target === join(t.stateDir, "receipts", `${plan.transactionId}.json`) &&
      JSON.parse(await readFile(source, "utf8")).status === "committed"
    )
      throw new Error("receipt rename failed");
    return actual.rename(source, target);
  });
  await expect(applyInstallPlan(t.context, plan)).rejects.toThrow(
    "receipt rename failed",
  );
  expect(await readFile(old.targetPath, "utf8")).toBe("old");
  expect(await readFile(join(t.stateDir, "state.json"))).toEqual(stateBefore);
  expect((await storedReceipt(t.stateDir, plan.transactionId)).status).toBe(
    "rolled_back",
  );
});

it("preserves a lock replaced between exclusive creation and path inspection", async () => {
  const t = await fixture();
  const plan = await planInstall(t.context, [t.artifact()]);
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.spyOn(fs, "open").mockImplementation(async (path, flags, mode) => {
    const handle = await actual.open(path, flags, mode);
    if (path !== join(t.stateDir, "lock.json") || flags !== "wx") return handle;
    return new Proxy(handle, {
      get(target, property) {
        if (property === "close")
          return async () => {
            await target.close();
            const replacement = join(t.stateDir, "replacement");
            await writeFile(replacement, "external lock");
            await rename(replacement, path);
          };
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
  await expect(applyInstallPlan(t.context, plan)).rejects.toMatchObject({
    kind: "RECOVERY_REQUIRED",
  });
  expect(await readFile(join(t.stateDir, "lock.json"), "utf8")).toBe(
    "external lock",
  );
  await absent(t.root);
});

it("blocks malformed receipt action enums instead of coercing them", async () => {
  const t = await fixture();
  const id = randomUUID();
  const time = new Date().toISOString();
  await mkdir(join(t.stateDir, "receipts"), { recursive: true });
  await writeFile(
    join(t.stateDir, "receipts", `${id}.json`),
    JSON.stringify({
      schemaVersion: 1,
      transactionId: id,
      startedAt: time,
      completedAt: time,
      status: "committed",
      actions: [
        {
          artifactId: "fixture.old",
          targetPath: join(t.root, "old"),
          action: ["CREATE"],
          afterHash: hashContent("old"),
        },
      ],
    }),
  );
  await expect(t.install([t.artifact()])).rejects.toMatchObject({
    kind: "RECOVERY_REQUIRED",
  });
  await absent(t.root);
});

it("rejects relative caller targets even when cwd resolution falls inside an allowed root", async () => {
  const t = await fixture();
  const cwd = fileURLToPath(new URL("../../", import.meta.url));
  const desired = {
    ...t.artifact(),
    targetPath: relative(cwd, t.artifact().targetPath),
  };
  const plan = await planInstall(t.context, [desired]);
  expect(plan.conflicts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "INVALID_TARGET" }),
    ]),
  );
  expect(plan.canApply).toBe(false);
  await absent(t.stateDir);
  await absent(t.root);
});

it.each([
  "NOOP bytes changed",
  "ownership removed",
  "ownership adopted",
  "record target moved",
  "managed mode changed",
])(
  "rejects semantic stale plan before unrelated creation: %s",
  async (change) => {
    const t = await fixture();
    const stable = t.artifact("fixture.zeta", "old", 0o640);
    const create = t.artifact("fixture.alpha", "new");
    await t.install([stable]);
    const plan = await planInstall(t.context, [create, stable]);
    expect(plan.actions.map((a) => a.kind)).toEqual(["CREATE", "NOOP"]);
    const state = await readState(t.stateDir);
    if (change === "NOOP bytes changed")
      await writeFile(stable.targetPath, "external");
    else if (change === "managed mode changed")
      await chmod(stable.targetPath, 0o644);
    else {
      if (change === "ownership removed") delete state.artifacts[stable.id];
      else
        state.artifacts[stable.id] = {
          ...state.artifacts[stable.id]!,
          ...(change === "ownership adopted"
            ? { ownership: "adopted" as const }
            : { targetPath: join(t.root, "moved") }),
        };
      await writeStateFixture(t.stateDir, state);
    }
    const stateBefore = await readFile(join(t.stateDir, "state.json"));
    const receiptNames = await readdir(join(t.stateDir, "receipts"));
    await expect(applyInstallPlan(t.context, plan)).rejects.toMatchObject({
      kind: "STALE_PLAN",
    });
    await absent(create.targetPath);
    expect(await readFile(join(t.stateDir, "state.json"))).toEqual(stateBefore);
    expect(await readdir(join(t.stateDir, "receipts"))).toEqual(receiptNames);
  },
);

it("rejects planning an existing artifact ID at a different target", async () => {
  const t = await fixture();
  const old = t.artifact();
  await t.install([old]);
  const target = join(t.root, "new-location");
  await writeFile(target, "old");
  const plan = await planInstall(t.context, [{ ...old, targetPath: target }]);
  expect(plan.conflicts[0]?.kind).toBe("STATE_INCONSISTENCY");
  expect(plan.actions).toEqual([]);
  expect(await readFile(target, "utf8")).toBe("old");
});

it("restores exact prior state bytes and files after failure following state persistence", async () => {
  const t = await fixture();
  const old = t.artifact("fixture.alpha", "old", 0o640);
  await t.install([old]);
  const stateFile = join(t.stateDir, "state.json");
  const oldState = Buffer.from(`  ${await readFile(stateFile, "utf8")}\n`);
  await writeFile(stateFile, oldState);
  await chmod(stateFile, 0o640);
  const plan = await planInstall(t.context, [
    { ...old, content: "new", mode: 0o600 },
    t.artifact("fixture.beta", "created"),
  ]);
  await expect(
    applyInstallPlan(t.context, plan, {
      afterStateWrite: async () => {
        expect(
          (await readState(t.stateDir)).artifacts[old.id]?.contentHash,
        ).toBe(hashContent("new"));
        throw new Error("late failure");
      },
    }),
  ).rejects.toThrow("late failure");
  expect(await readFile(old.targetPath, "utf8")).toBe("old");
  expect((await lstat(old.targetPath)).mode & 0o777).toBe(0o640);
  expect(await readFile(stateFile)).toEqual(oldState);
  expect((await lstat(stateFile)).mode & 0o777).toBe(0o640);
  await absent(t.artifact("fixture.beta").targetPath);
  expect((await storedReceipt(t.stateDir, plan.transactionId)).status).toBe(
    "rolled_back",
  );
  expect(
    await readFile(
      join(t.stateDir, "backups", plan.transactionId, "state-before.bin"),
    ),
  ).toEqual(oldState);
});

it("restores first-run state absence after failure following state persistence", async () => {
  const t = await fixture();
  const desired = t.artifact();
  const plan = await planInstall(t.context, [desired]);
  await expect(
    applyInstallPlan(t.context, plan, {
      afterStateWrite: () => {
        throw new Error("late failure");
      },
    }),
  ).rejects.toThrow("late failure");
  await absent(desired.targetPath);
  await absent(join(t.stateDir, "state.json"));
  await absent(t.root);
  expect((await storedReceipt(t.stateDir, plan.transactionId)).status).toBe(
    "rolled_back",
  );
});

it("persists recovery failure when prior state cannot be restored", async () => {
  const t = await fixture();
  const old = t.artifact();
  await t.install([old]);
  const plan = await planInstall(t.context, [{ ...old, content: "new" }]);
  await expect(
    applyInstallPlan(t.context, plan, {
      afterStateWrite: () => {
        throw new Error("late failure");
      },
      beforeStateRestore: () => {
        throw new Error("restore failure");
      },
    }),
  ).rejects.toMatchObject({ kind: "RECOVERY_REQUIRED" });
  expect((await storedReceipt(t.stateDir, plan.transactionId)).status).toBe(
    "failed",
  );
  expect(await readFile(old.targetPath, "utf8")).toBe("old");
  expect(await lstat(join(t.stateDir, "lock.json"))).toBeDefined();
  // Simulate manual lock removal: the failed receipt must remain a blocker independently.
  await unlink(join(t.stateDir, "lock.json"));
  const next = await planInstall(t.context, [t.artifact("fixture.beta")]);
  await expect(applyInstallPlan(t.context, next)).rejects.toMatchObject({
    kind: "RECOVERY_REQUIRED",
  });
  await absent(t.artifact("fixture.beta").targetPath);
});

it.each(["prepared", "applying", "failed", "committed", "rolled_back"])(
  "enforces persisted receipt status: %s",
  async (status) => {
    const t = await fixture();
    const id = randomUUID();
    const time = new Date().toISOString();
    await mkdir(join(t.stateDir, "receipts"), { recursive: true });
    await writeFile(
      join(t.stateDir, "receipts", `${id}.json`),
      JSON.stringify({
        schemaVersion: 1,
        transactionId: id,
        startedAt: time,
        completedAt: time,
        status,
        actions: [],
      }),
    );
    const plan = await planInstall(t.context, [t.artifact()]);
    if (status === "committed" || status === "rolled_back")
      expect((await applyInstallPlan(t.context, plan))?.status).toBe(
        "committed",
      );
    else {
      await expect(applyInstallPlan(t.context, plan)).rejects.toMatchObject({
        kind: "RECOVERY_REQUIRED",
      });
      await absent(t.artifact().targetPath);
    }
  },
);

it.each([
  "not-json",
  JSON.stringify({ schemaVersion: 2, status: "committed" }),
  JSON.stringify({ status: "rolled_back" }),
  "null",
])("rejects malformed or unsupported persisted receipt: %s", async (source) => {
  const t = await fixture();
  await mkdir(join(t.stateDir, "receipts"), { recursive: true });
  await writeFile(join(t.stateDir, "receipts", `${randomUUID()}.json`), source);
  await expect(t.install([t.artifact()])).rejects.toMatchObject({
    kind: "RECOVERY_REQUIRED",
  });
  await absent(t.artifact().targetPath);
});

it.each(["stateDir", "receipts", "backups", "state.json"])(
  "rejects symlinked state layout: %s",
  async (part) => {
    const t = await fixture();
    const plan = await planInstall(t.context, [t.artifact()]);
    const outside = join(t.home, "outside");
    await mkdir(outside);
    const sentinel = join(outside, "sentinel");
    await writeFile(sentinel, "untouched");
    if (part === "stateDir") await symlink(outside, t.stateDir);
    else {
      await mkdir(t.stateDir);
      await symlink(
        part === "state.json" ? sentinel : outside,
        join(t.stateDir, part),
      );
    }
    await expect(applyInstallPlan(t.context, plan)).rejects.toMatchObject({
      kind: "STATE_INVALID",
    });
    expect(await readFile(sentinel, "utf8")).toBe("untouched");
    expect(await readdir(outside)).toEqual(["sentinel"]);
    await absent(t.root);
  },
);

it("rejects relative stateDir and managed targets overlapping stateDir", async () => {
  const t = await fixture();
  expect(
    (
      await planInstall({ ...t.context, stateDir: "relative-state" }, [
        t.artifact(),
      ])
    ).conflicts[0]?.kind,
  ).toBe("STATE_INVALID");
  for (const targetPath of [
    t.stateDir,
    join(t.stateDir, "state.json"),
    join(t.stateDir, "backups", "target"),
  ]) {
    const plan = await planInstall(
      { ...t.context, allowedTargetRoots: [t.home] },
      [{ ...t.artifact(), targetPath }],
    );
    expect(plan.conflicts[0]?.kind).toBe("INVALID_TARGET");
    expect(plan.canApply).toBe(false);
  }
  await absent(t.stateDir);
});

it("rejects symlinks above the allowed root", async () => {
  const t = await fixture();
  const outside = join(t.home, "outside");
  await mkdir(outside);
  const alias = join(t.home, "alias");
  await symlink(outside, alias);
  const root = join(alias, "root");
  const plan = await planInstall({ ...t.context, allowedTargetRoots: [root] }, [
    { ...t.artifact(), targetPath: join(root, "file") },
  ]);
  expect(plan.conflicts[0]?.kind).toBe("INVALID_TARGET");
  expect(await readdir(outside)).toEqual([]);
  await absent(t.stateDir);
});

it("rejects roots that require directory creation above the allowed root", async () => {
  const t = await fixture();
  const missing = join(t.home, "missing");
  const root = join(missing, "root");
  const plan = await planInstall({ ...t.context, allowedTargetRoots: [root] }, [
    { ...t.artifact(), targetPath: join(root, "file") },
  ]);
  expect(plan.conflicts[0]?.kind).toBe("INVALID_TARGET");
  await absent(missing);
  await absent(t.stateDir);
});

it("detects local managed mode drift without rewriting", async () => {
  const t = await fixture();
  const old = t.artifact("fixture.alpha", "same", 0o640);
  await t.install([old]);
  await chmod(old.targetPath, 0o644);
  const plan = await planInstall(t.context, [old]);
  expect(plan.conflicts[0]?.kind).toBe("MANAGED_DRIFT");
  expect(plan.canApply).toBe(false);
  expect((await lstat(old.targetPath)).mode & 0o777).toBe(0o644);
});

it("applies desired mode changes and retains managed mode when omitted later", async () => {
  const t = await fixture();
  const old = t.artifact("fixture.alpha", "same", 0o640);
  await t.install([old]);
  const plan = await planInstall(t.context, [{ ...old, mode: 0o600 }]);
  expect(plan.actions[0]?.kind).toBe("REPLACE_MANAGED");
  await applyInstallPlan(t.context, plan);
  expect((await lstat(old.targetPath)).mode & 0o777).toBe(0o600);
  await t.install([t.artifact("fixture.alpha", "new")]);
  expect((await readState(t.stateDir)).artifacts[old.id]?.mode).toBe(0o600);
  expect(
    (await planInstall(t.context, [t.artifact("fixture.alpha", "new")]))
      .actions[0]?.kind,
  ).toBe("NOOP");
});

it("records original mode, stores private backups, and restores original mode", async () => {
  const t = await fixture();
  const old = t.artifact("fixture.alpha", "old", 0o754);
  await t.install([old]);
  const plan = await planInstall(t.context, [
    { ...old, content: "new", mode: 0o600 },
    t.artifact("fixture.beta"),
  ]);
  await expect(
    applyInstallPlan(t.context, plan, {
      beforeWrite: (_action, index) => {
        if (index === 1) throw new Error("rollback");
      },
    }),
  ).rejects.toThrow("rollback");
  const receipt = await storedReceipt(t.stateDir, plan.transactionId);
  expect(receipt.actions[0]?.beforeMode).toBe(0o754);
  const backup = join(
    t.stateDir,
    "backups",
    plan.transactionId,
    receipt.actions[0]!.backupFile!,
  );
  expect((await lstat(backup)).mode & 0o777).toBe(0o600);
  expect(await readFile(backup, "utf8")).toBe("old");
  expect((await lstat(old.targetPath)).mode & 0o777).toBe(0o754);
  expect(await readFile(old.targetPath, "utf8")).toBe("old");
});

it.each(["../escape", "/absolute", "a/b", "a\\b", "", ".."])(
  "rejects forged transaction ID before creating state: %s",
  async (transactionId) => {
    const t = await fixture();
    const plan = await planInstall(t.context, [t.artifact()]);
    await expect(
      applyInstallPlan(t.context, { ...plan, transactionId }),
    ).rejects.toMatchObject({ kind: "STATE_INVALID" });
    expect(await readdir(t.home)).toEqual([]);
  },
);

it("does not track or delete an external file when target publication fails", async () => {
  const t = await fixture();
  const desired = t.artifact();
  const plan = await planInstall(t.context, [desired]);
  const actualLink = (
    await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises")
  ).link;
  vi.spyOn(fs, "link").mockImplementation(async (source, target) => {
    if (target === desired.targetPath) {
      await writeFile(target, "external");
      throw new Error("publication failed");
    }
    return actualLink(source, target);
  });
  await expect(applyInstallPlan(t.context, plan)).rejects.toThrow(
    "publication failed",
  );
  expect(await readFile(desired.targetPath, "utf8")).toBe("external");
  expect((await storedReceipt(t.stateDir, plan.transactionId)).status).toBe(
    "rolled_back",
  );
  await absent(join(t.stateDir, "state.json"));
});

it("preserves an unrelated replacement during created-file rollback and blocks recovery", async () => {
  const t = await fixture();
  const desired = t.artifact();
  const plan = await planInstall(t.context, [desired]);
  await expect(
    applyInstallPlan(t.context, plan, {
      afterWrite: async (action) => {
        const other = join(t.root, "other");
        await writeFile(other, "external");
        await rename(other, action.artifact.targetPath);
        throw new Error("later failure");
      },
    }),
  ).rejects.toMatchObject({ kind: "RECOVERY_REQUIRED" });
  expect(await readFile(desired.targetPath, "utf8")).toBe("external");
  expect((await storedReceipt(t.stateDir, plan.transactionId)).status).toBe(
    "failed",
  );
});

it("removes successfully created files and restores replacements after a later failure", async () => {
  const t = await fixture();
  const old = t.artifact("fixture.alpha");
  await t.install([old]);
  const created = t.artifact("fixture.beta");
  const last = t.artifact("fixture.zeta");
  const stateBefore = await readFile(join(t.stateDir, "state.json"));
  const plan = await planInstall(t.context, [
    { ...old, content: "new" },
    created,
    last,
  ]);
  await expect(
    applyInstallPlan(t.context, plan, {
      beforeWrite: (_action, index) => {
        if (index === 2) throw new Error("third write failure");
      },
    }),
  ).rejects.toThrow("third write failure");
  expect(await readFile(old.targetPath, "utf8")).toBe("old");
  await absent(created.targetPath);
  await absent(last.targetPath);
  expect(await readFile(join(t.stateDir, "state.json"))).toEqual(stateBefore);
});

it.each(["artifact", "JSON"])(
  "uses exclusive temporary creation and preserves existing temp symlinks: %s",
  async (type) => {
    const t = await fixture();
    const root = type === "artifact" ? t.root : t.stateDir;
    await mkdir(root);
    const target = join(root, "file");
    const victim = join(t.home, "victim");
    await writeFile(victim, "untouched");
    const id = randomUUID();
    const temporary = join(dirname(target), `.file.${id}.tmp`);
    await symlink(victim, temporary);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(id);
    const write =
      type === "artifact"
        ? atomicWrite(target, Buffer.from("new"), 0o644, true, async () => {})
        : atomicJsonWrite(t.stateDir, target, {});
    await expect(write).rejects.toMatchObject({ code: "EEXIST" });
    expect(await readFile(victim, "utf8")).toBe("untouched");
    expect((await lstat(temporary)).isSymbolicLink()).toBe(true);
    await absent(target);
  },
);
