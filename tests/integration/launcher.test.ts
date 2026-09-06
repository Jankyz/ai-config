import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const launcher = new URL("../../bin/ai-config", import.meta.url);

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function makeRuntime(
  directory: string,
  name: "node" | "bun",
  version?: string,
): Promise<void> {
  const path = join(directory, name);
  const versionCheck = version
    ? `if [ "$1" = "--version" ]; then printf '%s\\n' "${version}"; exit 0; fi\n`
    : "";

  await writeFile(
    path,
    `#!/bin/sh\n${versionCheck}printf '%s:%s\\n' "${name}" "$*" > "$AI_CONFIG_RUNTIME_LOG"\n`,
  );
  await chmod(path, 0o755);
}

describe("runtime launcher", () => {
  it("prefers a supported Node runtime", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ai-config-launcher-"));
    temporaryDirectories.push(directory);
    const log = join(directory, "runtime.log");
    await makeRuntime(directory, "node", "v24.0.0");

    await execFileAsync(launcher.pathname, ["--help"], {
      env: {
        ...process.env,
        AI_CONFIG_RUNTIME_LOG: log,
        PATH: `${directory}:/usr/bin:/bin`,
      },
    });

    await expect(readFile(log, "utf8")).resolves.toContain("node:");
  });

  it("uses Bun when supported Node is unavailable", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ai-config-launcher-"));
    temporaryDirectories.push(directory);
    const log = join(directory, "runtime.log");
    await makeRuntime(directory, "bun");

    await execFileAsync(launcher.pathname, ["--version"], {
      env: {
        ...process.env,
        AI_CONFIG_RUNTIME_LOG: log,
        PATH: `${directory}:/usr/bin:/bin`,
      },
    });

    await expect(readFile(log, "utf8")).resolves.toContain("bun:");
  });

  it("fails clearly when neither runtime is available", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ai-config-launcher-"));
    temporaryDirectories.push(directory);

    const failure = await execFileAsync(launcher.pathname, ["--help"], {
      env: { ...process.env, PATH: "/usr/bin:/bin" },
    }).catch((error: unknown) => error as { stderr: string });

    expect(failure.stderr).toContain("Node.js 24 or newer, or Bun");
    expect(existsSync(join(directory, ".ai-config"))).toBe(false);
  });
});
