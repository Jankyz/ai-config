import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { join } from "node:path";

import { resolveProjectRoot } from "../../templates/index.js";

export const claudeProjectBridgeContent = "@AGENTS.md\n";
export type ClaudeProjectBridgeStatus =
  "CREATE" | "PRESERVE" | "CONFLICT" | "SKIP";

export interface ClaudeProjectBridgePlan {
  readonly status: ClaudeProjectBridgeStatus;
  readonly projectRoot: string;
  readonly agentsPath: string;
  readonly claudePath: string;
  readonly detail: string;
}

export interface ClaudeProjectBridgeApplyOptions {
  readonly beforeCreate?: (plan: ClaudeProjectBridgePlan) => Promise<void>;
}

export class ClaudeProjectBridgeStaleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ClaudeProjectBridgeStaleError";
  }
}

async function pathKind(
  path: string,
): Promise<"ABSENT" | "REGULAR" | "UNSAFE"> {
  try {
    const entry = await lstat(path);
    return entry.isFile() ? "REGULAR" : "UNSAFE";
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return "ABSENT";
    throw error;
  }
}

/** Plans the repository-owned seed bridge without using central installer state. */
export async function planClaudeProjectBridge(
  projectRoot: string,
): Promise<ClaudeProjectBridgePlan> {
  const physicalRoot = await resolveProjectRoot(projectRoot);
  const agentsPath = join(physicalRoot, "AGENTS.md");
  const claudePath = join(physicalRoot, "CLAUDE.md");
  if ((await pathKind(agentsPath)) !== "REGULAR")
    return {
      status: "SKIP",
      projectRoot: physicalRoot,
      agentsPath,
      claudePath,
      detail: "AGENTS.md is missing or not a safe regular file.",
    };
  const claudeKind = await pathKind(claudePath);
  if (claudeKind === "ABSENT")
    return {
      status: "CREATE",
      projectRoot: physicalRoot,
      agentsPath,
      claudePath,
      detail: "Create the seed-only @AGENTS.md bridge.",
    };
  if (claudeKind === "REGULAR")
    return {
      status: "PRESERVE",
      projectRoot: physicalRoot,
      agentsPath,
      claudePath,
      detail:
        "Existing project CLAUDE.md remains repository-owned and unchanged.",
    };
  return {
    status: "CONFLICT",
    projectRoot: physicalRoot,
    agentsPath,
    claudePath,
    detail: "CLAUDE.md is not a safe regular file.",
  };
}

/** Creates the exact bridge once, then leaves all later repository edits alone. */
export async function applyClaudeProjectBridge(
  projectRoot: string,
  options: ClaudeProjectBridgeApplyOptions = {},
): Promise<ClaudeProjectBridgePlan> {
  const plan = await planClaudeProjectBridge(projectRoot);
  if (plan.status !== "CREATE") return plan;
  await options.beforeCreate?.(plan);
  let current: ClaudeProjectBridgePlan;
  try {
    current = await planClaudeProjectBridge(plan.projectRoot);
  } catch (error) {
    throw new ClaudeProjectBridgeStaleError(
      `Project bridge became stale before creation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (current.status !== "CREATE") return current;
  const handle = await open(
    current.claudePath,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o644,
  );
  try {
    await handle.writeFile(claudeProjectBridgeContent, "utf8");
  } finally {
    await handle.close();
  }
  let created: string;
  try {
    const entry = await lstat(current.claudePath);
    if (!entry.isFile() || entry.isSymbolicLink())
      throw new Error("CLAUDE.md is not a safe regular file.");
    const readHandle = await open(
      current.claudePath,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      created = await readHandle.readFile("utf8");
    } finally {
      await readHandle.close();
    }
  } catch (error) {
    throw new ClaudeProjectBridgeStaleError(
      `Project bridge changed during creation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (created !== claudeProjectBridgeContent)
    throw new Error(
      "Claude project bridge did not preserve its exact seed bytes.",
    );
  return current;
}
