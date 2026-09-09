import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyCleanup,
  planCleanup,
  rollbackCleanup,
  type CleanupContext,
  type CleanupTarget,
} from "../../src/cleanup/index.js";

const roots: string[] = [];
async function fixture() {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-cleanup-")),
  );
  roots.push(root);
  const stateDir = join(root, "state");
  const skills = join(root, "skills");
  await mkdir(skills);
  const context: CleanupContext = {
    stateDir,
    preservePaths: [join(skills, "preserve")],
  };
  return { root, stateDir, skills, context };
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("bounded cleanup", () => {
  it("plans without mutation, removes only approved targets, and rolls back exact bytes", async () => {
    const test = await fixture();
    for (const name of ["a", "b", "preserve"]) {
      await mkdir(join(test.skills, name));
      await writeFile(join(test.skills, name, "SKILL.md"), name, {
        mode: 0o640,
      });
    }
    const targets: CleanupTarget[] = [
      { id: "cleanup.a", path: join(test.skills, "a"), kind: "legacy-skill" },
      { id: "cleanup.b", path: join(test.skills, "b"), kind: "legacy-skill" },
    ];
    const preview = await planCleanup(test.context, targets);
    expect(preview.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      readFile(join(test.skills, "a", "SKILL.md"), "utf8"),
    ).resolves.toBe("a");
    const id = await applyCleanup(test.context, targets, preview.fingerprint);
    await expect(
      readFile(join(test.skills, "a", "SKILL.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(join(test.skills, "preserve", "SKILL.md"), "utf8"),
    ).resolves.toBe("preserve");
    await rollbackCleanup(test.context, id);
    await expect(
      readFile(join(test.skills, "a", "SKILL.md"), "utf8"),
    ).resolves.toBe("a");
  });

  it("fails closed when bytes change, a tree entry appears, a symlink is present, or preserved content is targeted", async () => {
    const test = await fixture();
    const target = join(test.skills, "a");
    await mkdir(target);
    await writeFile(join(target, "SKILL.md"), "a");
    const targets: CleanupTarget[] = [
      { id: "cleanup.a", path: target, kind: "legacy-skill" },
    ];
    const preview = await planCleanup(test.context, targets);
    await writeFile(join(target, "SKILL.md"), "changed");
    await expect(
      applyCleanup(test.context, targets, preview.fingerprint),
    ).rejects.toThrow(/PREVIEW_CHANGED/);
    await writeFile(join(target, "new.md"), "new");
    const second = await planCleanup(test.context, targets);
    await writeFile(join(target, "extra.md"), "extra");
    await expect(
      applyCleanup(test.context, targets, second.fingerprint),
    ).rejects.toThrow(/PREVIEW_CHANGED/);
    const linked = join(test.skills, "linked");
    await symlink(target, linked);
    await expect(
      planCleanup(test.context, [
        { id: "cleanup.link", path: linked, kind: "legacy-skill" },
      ]),
    ).rejects.toThrow(/unsafe|symbolic/i);
    await expect(
      planCleanup(test.context, [
        {
          id: "cleanup.preserve",
          path: join(test.skills, "preserve"),
          kind: "legacy-skill",
        },
      ]),
    ).rejects.toThrow(/preserved/i);
  });

  it("schedules OMX roots after legacy skills", async () => {
    const test = await fixture();
    const skill = join(test.skills, "legacy");
    const runtime = join(test.root, "omx");
    await mkdir(skill);
    await mkdir(runtime);
    await writeFile(join(skill, "SKILL.md"), "legacy");
    await writeFile(join(runtime, "state.json"), "state");
    const plan = await planCleanup(test.context, [
      { id: "cleanup.runtime", path: runtime, kind: "omx-runtime" },
      { id: "cleanup.skill", path: skill, kind: "legacy-skill" },
    ]);
    expect(plan.actions.map((action) => action.target.id)).toEqual([
      "cleanup.skill",
      "cleanup.runtime",
    ]);
  });
});
