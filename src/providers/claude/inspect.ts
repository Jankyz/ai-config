import { lstat } from "node:fs/promises";

import { InstallerError } from "../../core/installer.js";
import { safeRoot } from "../../installer/filesystem.js";
import type { ClaudeDetection } from "./detect.js";
import type { ClaudePaths } from "./paths.js";

export type ClaudePathKind = "ABSENT" | "REGULAR" | "SYMLINK" | "UNSUPPORTED";

export interface ClaudePathInspection {
  readonly kind: ClaudePathKind;
}

export interface ClaudeInspection {
  readonly detection: ClaudeDetection;
  readonly paths: ClaudePaths;
  readonly homeSafe: boolean;
  readonly globalClaude: ClaudePathInspection;
  readonly settingsJson: ClaudePathInspection;
}

async function inspectPath(path: string): Promise<ClaudePathInspection> {
  try {
    const info = await lstat(path, { bigint: false });
    if (info.isSymbolicLink()) return { kind: "SYMLINK" };
    return { kind: info.isFile() ? "REGULAR" : "UNSUPPORTED" };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return { kind: "ABSENT" };
    throw error;
  }
}

/** Inspects Claude paths without parsing or modifying any external Claude state. */
export async function inspectClaude(
  detection: ClaudeDetection,
): Promise<ClaudeInspection> {
  let homeSafe = true;
  try {
    await safeRoot(detection.paths.home, "INVALID_TARGET");
  } catch (error) {
    if (!(error instanceof InstallerError)) throw error;
    homeSafe = false;
  }
  if (!homeSafe)
    return {
      detection,
      paths: detection.paths,
      homeSafe,
      globalClaude: { kind: "ABSENT" },
      settingsJson: { kind: "ABSENT" },
    };
  return {
    detection,
    paths: detection.paths,
    homeSafe,
    globalClaude: await inspectPath(detection.paths.globalClaude),
    settingsJson: await inspectPath(detection.paths.settingsJson),
  };
}
