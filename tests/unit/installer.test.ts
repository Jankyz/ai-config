import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { hashContent, planInstall } from "../../src/installer/index.js";

const directories: string[] = [];
async function context() {
  const home = await realpath(await mkdtemp(join(tmpdir(), "ai-config-unit-")));
  directories.push(home);
  const root = join(home, "targets");
  return {
    homeDir: home,
    stateDir: join(home, "state"),
    allowedTargetRoots: [root],
    root,
  };
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("installer planning", () => {
  it("hashes exact bytes and sorts actions by artifact ID", async () => {
    expect(hashContent("a\n")).not.toBe(hashContent("a\r\n"));
    const test = await context();
    const plan = await planInstall(test, [
      {
        id: "fixture.zeta",
        targetPath: join(test.root, "z"),
        content: "z",
        ownership: "managed",
      },
      {
        id: "fixture.alpha",
        targetPath: join(test.root, "a"),
        content: "a",
        ownership: "managed",
      },
    ]);
    expect(plan.actions.map((action) => action.artifact.id)).toEqual([
      "fixture.alpha",
      "fixture.zeta",
    ]);
  });

  it("rejects duplicate identities, targets, and paths outside explicit roots", async () => {
    const test = await context();
    const plan = await planInstall(test, [
      {
        id: "fixture.alpha",
        targetPath: join(test.root, "one"),
        content: "a",
        ownership: "managed",
      },
      {
        id: "fixture.alpha",
        targetPath: join(test.root, "two"),
        content: "b",
        ownership: "managed",
      },
      {
        id: "fixture.beta",
        targetPath: join(test.root, "one"),
        content: "c",
        ownership: "managed",
      },
      {
        id: "fixture.outside",
        targetPath: join(test.homeDir, "outside"),
        content: "d",
        ownership: "managed",
      },
    ]);
    expect(plan.canApply).toBe(false);
    expect(plan.conflicts.map((entry) => entry.kind)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ARTIFACT_ID",
        "DUPLICATE_TARGET",
        "INVALID_TARGET",
      ]),
    );
  });
});
