import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";
import { InstallerError } from "../core/installer.js";
import type { ConflictKind } from "../core/installer.js";

export const hashContent = (content: Uint8Array | string): string =>
  createHash("sha256").update(content).digest("hex");

export function isNodeError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function absolutePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    !path.includes("\0") &&
    isAbsolute(path) &&
    resolve(path) !== parse(path).root
  );
}

export function inside(root: string, path: string): boolean {
  const part = relative(root, path);
  return (
    part === "" ||
    (part !== ".." && !part.startsWith(`..${sep}`) && !isAbsolute(part))
  );
}

export async function statOrMissing(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return undefined;
    throw error;
  }
}

/** Check every ancestor, including ancestors above the configured root. Never resolve symlinks. */
export async function safePath(
  path: string,
  leaf: "file" | "directory",
  kind: ConflictKind,
): Promise<void> {
  if (!absolutePath(path))
    throw new InstallerError(
      kind,
      "An explicit non-root absolute path is required.",
    );
  const chain: string[] = [];
  for (
    let cursor = resolve(path);
    cursor !== dirname(cursor);
    cursor = dirname(cursor)
  )
    chain.unshift(cursor);
  for (const cursor of chain) {
    const info = await statOrMissing(cursor);
    if (!info) continue;
    if (
      info.isSymbolicLink() ||
      (cursor === resolve(path) && leaf === "file"
        ? !info.isFile()
        : !info.isDirectory())
    )
      throw new InstallerError(kind, `Unsafe path component: ${cursor}`);
  }
}

/** A missing root is allowed only when its immediate parent already exists safely. */
export async function safeRoot(
  root: string,
  kind: ConflictKind,
): Promise<void> {
  await safePath(root, "directory", kind);
  const parent = await statOrMissing(dirname(resolve(root)));
  if (!parent?.isDirectory())
    throw new InstallerError(
      kind,
      "Root parent must already exist; creation above the root is forbidden.",
    );
}

export interface FileEvidence {
  readonly hash: string;
  readonly mode: number;
  readonly dev: number;
  readonly ino: number;
}
export interface FileSnapshot extends FileEvidence {
  readonly bytes: Buffer;
}

export async function readRegular(
  path: string,
): Promise<FileSnapshot | undefined> {
  if (!(await statOrMissing(path))) return undefined;
  const handle = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const info = await handle.stat();
    if (!info.isFile())
      throw new InstallerError("STATE_INVALID", `Not a regular file: ${path}`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (info.ctimeMs !== after.ctimeMs || info.size !== after.size)
      throw new InstallerError(
        "STALE_PLAN",
        `File changed while reading: ${path}`,
      );
    return {
      bytes,
      hash: hashContent(bytes),
      mode: info.mode & 0o7777,
      dev: info.dev,
      ino: info.ino,
    };
  } finally {
    await handle.close();
  }
}

export function matchesFile(
  current: FileSnapshot | undefined,
  expected: FileEvidence | undefined,
): boolean {
  return current === undefined
    ? expected === undefined
    : expected !== undefined &&
        current.dev === expected.dev &&
        current.ino === expected.ino &&
        current.hash === expected.hash &&
        current.mode === expected.mode;
}

/** Creates containers one at a time so rollback owns only directories it actually created. */
export async function makeDirectories(
  root: string,
  directory: string,
  created: string[] = [],
): Promise<void> {
  if (!inside(root, directory))
    throw new InstallerError(
      "INVALID_TARGET",
      "Directory is outside its root.",
    );
  await safeRoot(root, "INVALID_TARGET");
  const paths: string[] = [];
  for (let cursor = directory; inside(root, cursor); cursor = dirname(cursor)) {
    paths.unshift(cursor);
    if (cursor === root) break;
  }
  for (const path of paths) {
    await safePath(path, "directory", "INVALID_TARGET");
    try {
      await mkdir(path, { mode: 0o700 });
      created.push(path);
    } catch (error) {
      if (!isNodeError(error, "EEXIST")) throw error;
      await safePath(path, "directory", "INVALID_TARGET");
    }
  }
}

/** Exclusive temp creation; link publishes absent targets without clobbering a racing creator. */
export async function atomicWrite(
  path: string,
  content: Uint8Array,
  mode: number,
  absent: boolean,
  beforePublish: () => Promise<void>,
): Promise<FileEvidence> {
  if (!absolutePath(path) || resolve(path) !== path)
    throw new InstallerError(
      "INVALID_TARGET",
      "Atomic write paths must be normalized and absolute.",
    );
  await safePath(path, "file", "INVALID_TARGET");
  const temp = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  const handle = await open(temp, "wx", 0o600);
  try {
    await handle.writeFile(content);
    await handle.chmod(mode);
    const info = await handle.stat();
    await handle.close();
    await beforePublish();
    await safePath(path, "file", "INVALID_TARGET");
    if (absent) await link(temp, path);
    else await rename(temp, path);
    return { hash: hashContent(content), mode, dev: info.dev, ino: info.ino };
  } finally {
    await handle.close();
    await unlink(temp).catch(() => undefined);
  }
}
