import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryHomes: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryHomes
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("CLI entry point", () => {
  it("runs with an isolated HOME and does not create provider state", async () => {
    const home = await mkdtemp(join(tmpdir(), "ai-config-home-"));
    temporaryHomes.push(home);
    const entryPoint = new URL("../../dist/cli/index.js", import.meta.url);

    const { stdout } = await execFileAsync(
      process.execPath,
      [entryPoint.pathname, "--help"],
      {
        env: { ...process.env, HOME: home },
      },
    );

    expect(stdout).toContain("Usage:");
    expect(existsSync(join(home, ".ai-config"))).toBe(false);
    expect(existsSync(join(home, ".codex"))).toBe(false);
    expect(existsSync(join(home, ".claude"))).toBe(false);
  });
});
