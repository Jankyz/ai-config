import { lstat, open } from "node:fs/promises";
import { constants } from "node:fs";

import { safeRoot } from "../../installer/filesystem.js";
import { InstallerError } from "../../core/installer.js";
import type { CodexDetection } from "./detect.js";
import type { CodexPaths } from "./paths.js";

export type CodexPathKind = "ABSENT" | "REGULAR" | "SYMLINK" | "UNSUPPORTED";

export interface CodexPathInspection {
  readonly kind: CodexPathKind;
  readonly active?: boolean;
}

export interface CodexInspection {
  readonly detection: CodexDetection;
  readonly paths: CodexPaths;
  readonly homeSafe: boolean;
  readonly globalAgents: CodexPathInspection;
  readonly globalOverride: CodexPathInspection;
  readonly configToml: CodexPathInspection;
}

async function inspectPath(
  path: string,
  inspectContents = false,
): Promise<CodexPathInspection> {
  let info;
  try {
    info = await lstat(path);
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
  if (info.isSymbolicLink()) return { kind: "SYMLINK" };
  if (!info.isFile()) return { kind: "UNSUPPORTED" };
  if (!inspectContents) return { kind: "REGULAR" };
  const handle = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const bytes = await handle.readFile();
    return { kind: "REGULAR", active: /\S/.test(bytes.toString("utf8")) };
  } finally {
    await handle.close();
  }
}

export async function inspectCodex(
  detection: CodexDetection,
): Promise<CodexInspection> {
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
      globalAgents: { kind: "ABSENT" },
      globalOverride: { kind: "ABSENT" },
      configToml: { kind: "ABSENT" },
    };
  return {
    detection,
    paths: detection.paths,
    homeSafe,
    globalAgents: await inspectPath(detection.paths.globalAgents),
    globalOverride: await inspectPath(detection.paths.globalOverride, true),
    configToml: await inspectPath(detection.paths.configToml),
  };
}
