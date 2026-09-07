import { randomUUID } from "node:crypto";
import { link, mkdir, open, unlink } from "node:fs/promises";
import { join, parse, resolve } from "node:path";
import {
  absolutePath,
  isNodeError,
  matchesFile,
  readRegular,
  safePath,
  safeRoot,
  statOrMissing,
} from "../installer/filesystem.js";
import { defaultLimits } from "./github.js";
import {
  SourceError,
  treeDigest,
  type SourceFile,
  validateResourcePath,
} from "./integrity.js";

export interface CacheLimits {
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
  readonly maxFiles: number;
  readonly maxRecordBytes: number;
}

export const defaultCacheLimits: CacheLimits = {
  maxFileBytes: defaultLimits.maxFileBytes,
  maxTotalBytes: defaultLimits.maxTotalBytes,
  maxFiles: defaultLimits.maxFiles,
  maxRecordBytes:
    Math.ceil((defaultLimits.maxTotalBytes * 4) / 3) +
    defaultLimits.maxFiles * 1024 +
    64 * 1024,
};

function cachePath(root: string, key: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(key))
    throw new SourceError("Unsafe cache key.");
  return join(root, `${key}.json`);
}

async function safeCacheRoot(root: string): Promise<string> {
  if (
    !absolutePath(root) ||
    resolve(root) !== root ||
    root === parse(root).root
  )
    throw new SourceError(
      "Cache root must be an explicit normalized absolute path.",
    );
  try {
    await safeRoot(root, "INVALID_TARGET");
    await mkdir(root, { mode: 0o700 });
  } catch (error) {
    if (!isNodeError(error, "EEXIST")) {
      if (error instanceof Error)
        throw new SourceError(`Unsafe cache root: ${error.message}`);
      throw error;
    }
  }
  try {
    await safePath(root, "directory", "INVALID_TARGET");
  } catch (error) {
    if (error instanceof Error)
      throw new SourceError(`Unsafe cache root: ${error.message}`);
    throw error;
  }
  return root;
}

async function safelyRemoveEntry(
  target: string,
  snapshot: Awaited<ReturnType<typeof readRegular>>,
): Promise<void> {
  if (!snapshot) return;
  const current = await readRegular(target);
  if (!matchesFile(current, snapshot))
    throw new SourceError("Cache entry changed while being invalidated.");
  await safePath(target, "file", "INVALID_TARGET");
  await unlink(target);
}

async function safelyRemoveOversizedEntry(
  target: string,
  observed: NonNullable<Awaited<ReturnType<typeof statOrMissing>>>,
): Promise<void> {
  const current = await statOrMissing(target);
  if (
    !current?.isFile() ||
    current.dev !== observed.dev ||
    current.ino !== observed.ino
  )
    throw new SourceError("Cache entry changed while being invalidated.");
  await safePath(target, "file", "INVALID_TARGET");
  await unlink(target);
}

function validateCacheFiles(
  files: readonly SourceFile[],
  limits: CacheLimits,
): void {
  if (files.length > limits.maxFiles)
    throw new SourceError("Cache resource exceeds file-count limit.");
  let total = 0;
  for (const file of files) {
    if (!validateResourcePath(file.path))
      throw new SourceError(`Unsafe cache path: ${file.path}`);
    if (file.bytes.byteLength > limits.maxFileBytes)
      throw new SourceError(`Cache file exceeds size limit: ${file.path}`);
    total += file.bytes.byteLength;
    if (total > limits.maxTotalBytes)
      throw new SourceError("Cache resource exceeds total-size limit.");
  }
}

export async function writeCachedResource(
  rootInput: string,
  key: string,
  files: readonly SourceFile[],
  limits: CacheLimits = defaultCacheLimits,
): Promise<void> {
  validateCacheFiles(files, limits);
  const root = await safeCacheRoot(rootInput);
  const target = cachePath(root, key);
  const digest = treeDigest(files);
  if (await readCachedResource(root, key, digest, limits)) return;
  await safePath(target, "file", "INVALID_TARGET");
  if (await statOrMissing(target))
    throw new SourceError("Cache entry appeared during publication.");
  const temporary = join(root, `.${key}.${randomUUID()}.tmp`);
  const record = Buffer.from(
    JSON.stringify({
      files: files.map((file) => ({
        path: file.path,
        mode: file.mode,
        bytes: Buffer.from(file.bytes).toString("base64"),
      })),
    }),
  );
  if (record.byteLength > limits.maxRecordBytes)
    throw new SourceError("Cache record exceeds size limit.");
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(record);
    await handle.chmod(0o600);
    await handle.sync();
    await safePath(target, "file", "INVALID_TARGET");
    await link(temporary, target);
  } finally {
    await handle.close();
    await unlink(temporary).catch(() => undefined);
  }
}

export async function readCachedResource(
  rootInput: string,
  key: string,
  expectedDigest: string,
  limits: CacheLimits = defaultCacheLimits,
): Promise<readonly SourceFile[] | undefined> {
  const root = await safeCacheRoot(rootInput);
  const target = cachePath(root, key);
  try {
    await safePath(target, "file", "INVALID_TARGET");
    const observed = await statOrMissing(target);
    if (!observed) return undefined;
    if (!observed.isFile())
      throw new SourceError("Cache entry is not a regular file.");
    if (observed.size > limits.maxRecordBytes) {
      await safelyRemoveOversizedEntry(target, observed);
      return undefined;
    }
    const snapshot = await readRegular(target);
    if (!snapshot) return undefined;
    try {
      const data = JSON.parse(snapshot.bytes.toString("utf8")) as {
        files?: { path: string; mode?: string; bytes: string }[];
      };
      if (!Array.isArray(data.files))
        throw new SourceError("Invalid cache record.");
      const files = data.files.map((file) => ({
        path: file.path,
        ...(file.mode ? { mode: file.mode } : {}),
        bytes: Buffer.from(file.bytes, "base64"),
      }));
      validateCacheFiles(files, limits);
      if (treeDigest(files) !== expectedDigest)
        throw new SourceError("Cache digest mismatch.");
      return files;
    } catch (error) {
      await safelyRemoveEntry(target, snapshot);
      if (error instanceof SourceError || error instanceof SyntaxError)
        return undefined;
      throw error;
    }
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return undefined;
    if (error instanceof SourceError) throw error;
    if (error instanceof Error)
      throw new SourceError(`Unsafe cache entry: ${error.message}`);
    throw error;
  }
}
