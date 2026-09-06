import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ClaudePaths, ClaudeRuntimeContext } from "./paths.js";
import { resolveClaudePaths } from "./paths.js";

const execFileAsync = promisify(execFile);

export interface ClaudeCommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface ClaudeCommandRunner {
  run(
    executable: string,
    args: readonly string[],
  ): Promise<ClaudeCommandResult>;
}

export interface ClaudeDetection {
  readonly installed: boolean;
  readonly paths: ClaudePaths;
  readonly executable?: string;
  readonly versionOutput?: string;
  readonly error?: string;
}

export const systemClaudeRunner: ClaudeCommandRunner = {
  async run(executable, args) {
    const result = await execFileAsync(executable, args, {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    });
    return { stdout: result.stdout, stderr: result.stderr };
  },
};

function missingExecutable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

/** Runs the fixed `claude --version` command directly, never through a shell. */
export async function detectClaude(
  context: ClaudeRuntimeContext,
  runner: ClaudeCommandRunner = systemClaudeRunner,
): Promise<ClaudeDetection> {
  const paths = resolveClaudePaths(context);
  try {
    const result = await runner.run("claude", ["--version"]);
    return {
      installed: true,
      paths,
      executable: "claude",
      versionOutput: `${result.stdout}${result.stderr}`,
    };
  } catch (error) {
    if (missingExecutable(error)) return { installed: false, paths };
    return {
      installed: false,
      paths,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
