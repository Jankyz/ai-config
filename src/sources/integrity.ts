import { createHash } from "node:crypto";

export interface SourceFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mode?: string;
}

export function validateResourcePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    !path.includes("\0") &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  );
}

export const sha256 = (bytes: Uint8Array | string): string =>
  createHash("sha256").update(bytes).digest("hex");

export function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function verifySha256(
  bytes: Uint8Array | string,
  expected: string,
  label: string,
): void {
  if (!isSha256(expected) || sha256(bytes) !== expected)
    throw new SourceError(`${label} SHA-256 mismatch.`);
}

/** Stable identity of resource paths, modes, and bytes without serializing raw content. */
export function treeDigest(files: readonly SourceFile[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(sorted.map((file) => file.path)).size !== sorted.length)
    throw new SourceError("Duplicate resource paths are not allowed.");
  return sha256(
    sorted
      .map((file) => {
        if (!validateResourcePath(file.path))
          throw new SourceError(`Unsafe resource path: ${file.path}`);
        return `${file.path}\0${file.mode ?? "file"}\0${sha256(file.bytes)}\n`;
      })
      .join(""),
  );
}

export class SourceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SourceError";
  }
}
