import {
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

import type {
  DesiredArtifact,
  InstallerContext,
} from "../../src/core/index.js";
import { InstallerError } from "../../src/core/index.js";
import { applyInstallPlan, planInstall } from "../../src/installer/index.js";

const homes: string[] = [];
async function fixture(): Promise<{
  context: InstallerContext;
  root: string;
  home: string;
}> {
  const home = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-installer-")),
  );
  homes.push(home);
  const root = join(home, "targets");
  return {
    context: {
      homeDir: home,
      stateDir: join(home, "state"),
      allowedTargetRoots: [root],
    },
    root,
    home,
  };
}
const artifact = (
  id: string,
  targetPath: string,
  content: string,
): DesiredArtifact => ({ id, targetPath, content, ownership: "managed" });
afterEach(async () => {
  await Promise.all(
    homes.splice(0).map((home) => rm(home, { recursive: true, force: true })),
  );
});

describe("installer core filesystem safety", () => {
  it("creates, persists state and receipts, then produces a no-op plan", async () => {
    const test = await fixture();
    const desired = [
      {
        ...artifact("fixture.alpha", join(test.root, "alpha.txt"), "first"),
        mode: 0o640,
      },
    ];
    const first = await planInstall(test.context, desired);
    expect(first.actions[0]?.kind).toBe("CREATE");
    await expect(lstat(test.context.stateDir)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await applyInstallPlan(test.context, first)).toMatchObject({
      status: "committed",
    });
    await expect(readFile(join(test.root, "alpha.txt"), "utf8")).resolves.toBe(
      "first",
    );
    expect((await lstat(join(test.root, "alpha.txt"))).mode & 0o777).toBe(
      0o640,
    );
    await expect(
      readFile(join(test.context.stateDir, "state.json"), "utf8"),
    ).resolves.toContain("fixture.alpha");
    const repeat = await planInstall(test.context, desired);
    expect(repeat.actions[0]?.kind).toBe("NOOP");
    expect(repeat.hasChanges).toBe(false);
    await expect(
      applyInstallPlan(test.context, repeat),
    ).resolves.toBeUndefined();
  });

  it("backs up a managed replacement and preserves its prior mode by default", async () => {
    const test = await fixture();
    const target = join(test.root, "alpha.txt");
    await applyInstallPlan(
      test.context,
      await planInstall(test.context, [
        artifact("fixture.alpha", target, "old"),
      ]),
    );
    const replacement = await planInstall(test.context, [
      artifact("fixture.alpha", target, "new"),
    ]);
    expect(replacement.actions[0]?.kind).toBe("REPLACE_MANAGED");
    const receipt = await applyInstallPlan(test.context, replacement);
    expect(receipt?.actions[0]?.backupFile).toBe("0.bin");
    await expect(
      readFile(
        join(
          test.context.stateDir,
          "backups",
          replacement.transactionId,
          "0.bin",
        ),
        "utf8",
      ),
    ).resolves.toBe("old");
  });

  it("preserves unmanaged content, managed drift, symlink targets, and outside paths", async () => {
    const test = await fixture();
    await mkdir(test.root, { recursive: true });
    const unmanaged = join(test.root, "unmanaged");
    await writeFile(unmanaged, "mine");
    const managed = join(test.root, "managed");
    await applyInstallPlan(
      test.context,
      await planInstall(test.context, [
        artifact("fixture.managed", managed, "before"),
      ]),
    );
    await writeFile(managed, "edited");
    const link = join(test.root, "link");
    await symlink(unmanaged, link);
    const escapedParent = join(test.root, "escaped-parent");
    await symlink(test.home, escapedParent);
    const plan = await planInstall(test.context, [
      artifact("fixture.unmanaged", unmanaged, "new"),
      artifact("fixture.managed", managed, "after"),
      artifact("fixture.link", link, "new"),
      artifact("fixture.escaped", join(escapedParent, "outside"), "new"),
      artifact("fixture.outside", join(test.home, "outside"), "new"),
    ]);
    expect(plan.conflicts.map((entry) => entry.kind)).toEqual(
      expect.arrayContaining([
        "UNMANAGED_EXISTS",
        "MANAGED_DRIFT",
        "SYMLINK_TARGET",
        "INVALID_TARGET",
      ]),
    );
    await expect(readFile(unmanaged, "utf8")).resolves.toBe("mine");
    await expect(readFile(managed, "utf8")).resolves.toBe("edited");
  });

  it("distinguishes missing managed files and rejects stale plans and locks", async () => {
    const test = await fixture();
    const target = join(test.root, "alpha");
    const desired = [artifact("fixture.alpha", target, "one")];
    await applyInstallPlan(
      test.context,
      await planInstall(test.context, desired),
    );
    await rm(target);
    expect((await planInstall(test.context, desired)).actions[0]?.kind).toBe(
      "RECREATE_MISSING_MANAGED",
    );
    const stale = await planInstall(test.context, [
      artifact("fixture.alpha", target, "two"),
    ]);
    await writeFile(target, "external");
    await expect(applyInstallPlan(test.context, stale)).rejects.toMatchObject({
      kind: "STALE_PLAN",
    });
    await rm(target);
    await writeFile(join(test.context.stateDir, "lock.json"), "{}");
    const locked = await planInstall(test.context, [
      artifact("fixture.alpha", target, "three"),
    ]);
    await expect(applyInstallPlan(test.context, locked)).rejects.toMatchObject({
      kind: "TRANSACTION_LOCKED",
    });
  });

  it("rejects corrupt and future state without overwriting it", async () => {
    const test = await fixture();
    await mkdir(test.context.stateDir, { recursive: true });
    const state = join(test.context.stateDir, "state.json");
    await writeFile(state, "not-json");
    expect(
      (
        await planInstall(test.context, [
          artifact("fixture.alpha", join(test.root, "a"), "a"),
        ])
      ).conflicts[0]?.kind,
    ).toBe("STATE_INVALID");
    await expect(readFile(state, "utf8")).resolves.toBe("not-json");
    await writeFile(state, JSON.stringify({ schemaVersion: 2, artifacts: {} }));
    expect(
      (
        await planInstall(test.context, [
          artifact("fixture.alpha", join(test.root, "a"), "a"),
        ])
      ).conflicts[0]?.kind,
    ).toBe("STATE_INVALID");
  });

  it("represents adopted ownership but defers generic adopted writes", async () => {
    const test = await fixture();
    await mkdir(test.context.stateDir, { recursive: true });
    const target = join(test.root, "adopted");
    await writeFile(
      join(test.context.stateDir, "state.json"),
      JSON.stringify({
        schemaVersion: 1,
        artifacts: {
          "fixture.adopted": {
            id: "fixture.adopted",
            targetPath: target,
            ownership: "adopted",
            contentHash: "a".repeat(64),
            lastTransactionId: "previous",
          },
        },
      }),
    );
    const plan = await planInstall(test.context, [
      artifact("fixture.adopted", target, "new"),
    ]);
    expect(plan.conflicts[0]?.kind).toBe("UNSUPPORTED_ADOPTED_WRITE");
  });

  it("rolls back replacements and created files after an injected later write failure", async () => {
    const test = await fixture();
    const first = join(test.root, "one");
    const second = join(test.root, "two");
    await applyInstallPlan(
      test.context,
      await planInstall(test.context, [artifact("fixture.one", first, "old")]),
    );
    const plan = await planInstall(test.context, [
      artifact("fixture.one", first, "new"),
      artifact("fixture.two", second, "two"),
    ]);
    await expect(
      applyInstallPlan(test.context, plan, {
        beforeWrite: (_action, index) => {
          if (index === 1) throw new Error("injected failure");
        },
      }),
    ).rejects.toThrow("injected failure");
    await expect(readFile(first, "utf8")).resolves.toBe("old");
    await expect(lstat(second)).rejects.toMatchObject({ code: "ENOENT" });
    const receipts = await readFile(
      join(test.context.stateDir, "receipts", `${plan.transactionId}.json`),
      "utf8",
    );
    expect(receipts).toContain("rolled_back");
  });

  it("blocks new mutation when an interrupted receipt remains", async () => {
    const test = await fixture();
    await mkdir(join(test.context.stateDir, "receipts"), { recursive: true });
    await writeFile(
      join(test.context.stateDir, "receipts", "interrupted.json"),
      JSON.stringify({ status: "applying" }),
    );
    const plan = await planInstall(test.context, [
      artifact("fixture.alpha", join(test.root, "a"), "a"),
    ]);
    await expect(applyInstallPlan(test.context, plan)).rejects.toBeInstanceOf(
      InstallerError,
    );
    await expect(applyInstallPlan(test.context, plan)).rejects.toMatchObject({
      kind: "RECOVERY_REQUIRED",
    });
  });
});
