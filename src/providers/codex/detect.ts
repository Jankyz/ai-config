import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { CodexPaths, CodexRuntimeContext } from "./paths.js";
import { resolveCodexPaths } from "./paths.js";

const execFileAsync = promisify(execFile);

export interface CodexCommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface CodexCommandRunner {
  run(executable: string, args: readonly string[]): Promise<CodexCommandResult>;
}

export interface CodexDetection {
  readonly installed: boolean;
  readonly paths: CodexPaths;
  readonly executable?: string;
  readonly versionOutput?: string;
  readonly error?: string;
}

export const systemCodexRunner: CodexCommandRunner = {
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

/** Runs the fixed `codex --version` command directly, never through a shell. */
export async function detectCodex(
  context: CodexRuntimeContext,
  runner: CodexCommandRunner = systemCodexRunner,
): Promise<CodexDetection> {
  const paths = resolveCodexPaths(context);
  try {
    const result = await runner.run("codex", ["--version"]);
    return {
      installed: true,
      paths,
      executable: "codex",
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
