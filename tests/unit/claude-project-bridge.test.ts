import {
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

import {
  applyClaudeProjectBridge,
  claudeProjectBridgeContent,
  planClaudeProjectBridge,
} from "../../src/providers/claude/index.js";

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "ai-config-claude-bridge-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Claude project bridge", () => {
  it("creates the exact seed only for a safe AGENTS.md and preserves later edits", async () => {
    const root = await fixture();
    await writeFile(join(root, "AGENTS.md"), "project rules\n");
    await expect(planClaudeProjectBridge(root)).resolves.toMatchObject({
      status: "CREATE",
    });
    await expect(applyClaudeProjectBridge(root)).resolves.toMatchObject({
      status: "CREATE",
    });
    const claudePath = join(root, "CLAUDE.md");
    expect(await readFile(claudePath, "utf8")).toBe(claudeProjectBridgeContent);
    await writeFile(
      claudePath,
      `${claudeProjectBridgeContent}\nClaude detail\n`,
    );
    await expect(applyClaudeProjectBridge(root)).resolves.toMatchObject({
      status: "PRESERVE",
    });
    expect(await readFile(claudePath, "utf8")).toContain("Claude detail");
  });

  it("skips a missing or symlinked AGENTS.md and conflicts on an unsafe CLAUDE.md", async () => {
    const missing = await fixture();
    await expect(planClaudeProjectBridge(missing)).resolves.toMatchObject({
      status: "SKIP",
    });
    const unsafeAgents = await fixture();
    await writeFile(join(unsafeAgents, "source"), "outside\n");
    await symlink(
      join(unsafeAgents, "source"),
      join(unsafeAgents, "AGENTS.md"),
    );
    await expect(planClaudeProjectBridge(unsafeAgents)).resolves.toMatchObject({
      status: "SKIP",
    });
    const unsafeClaude = await fixture();
    await writeFile(join(unsafeClaude, "AGENTS.md"), "project\n");
    await symlink(
      join(unsafeClaude, "AGENTS.md"),
      join(unsafeClaude, "CLAUDE.md"),
    );
    await expect(planClaudeProjectBridge(unsafeClaude)).resolves.toMatchObject({
      status: "CONFLICT",
    });
  });

  it("uses the physical project root when passed a filesystem alias", async () => {
    const root = await fixture();
    const aliasParent = await fixture();
    const alias = join(aliasParent, "project-alias");
    await writeFile(join(root, "AGENTS.md"), "project\n");
    await symlink(root, alias);
    const plan = await planClaudeProjectBridge(alias);
    expect(plan.projectRoot).toBe(await realpath(root));
    await applyClaudeProjectBridge(alias);
    expect(await readFile(join(root, "CLAUDE.md"), "utf8")).toBe(
      claudeProjectBridgeContent,
    );
  });

  it("revalidates AGENTS.md immediately before creation and preserves a stale project", async () => {
    const root = await fixture();
    const agentsPath = join(root, "AGENTS.md");
    const claudePath = join(root, "CLAUDE.md");
    await writeFile(agentsPath, "project\n");
    await expect(planClaudeProjectBridge(root)).resolves.toMatchObject({
      status: "CREATE",
    });
    await expect(
      applyClaudeProjectBridge(root, {
        beforeCreate: async () => {
          await writeFile(join(root, "agent-source"), "outside\n");
          await rm(agentsPath);
          await symlink(join(root, "agent-source"), agentsPath);
        },
      }),
    ).resolves.toMatchObject({ status: "SKIP" });
    await expect(readFile(claudePath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
