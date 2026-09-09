import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import type { DesiredArtifact } from "../core/installer.js";
import { createHttpsClient, type HttpClient } from "../sources/github.js";
import { acquireNpmTarball, resolveNpmPackage } from "../sources/npm.js";
import { validateResourcePath, SourceError } from "../sources/integrity.js";
import { validateSourceState, type SourceLock } from "../sources/lock.js";
import type { SourceRegistry } from "../sources/registry.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const version = "1.17.0";
const expectedFiles = [
  "README.md",
  "dist/chunk-WJJKD6A2.js",
  "dist/external-skills-KEERQVBB.js",
  "dist/index.js",
  "package.json",
] as const;

async function sourceState(): Promise<{
  registry: SourceRegistry;
  lock: SourceLock;
}> {
  const [registryBytes, lockBytes] = await Promise.all([
    readFile(join(root, "upstream", "registry.json"), "utf8"),
    readFile(join(root, "upstream", "lock.json"), "utf8"),
  ]);
  const registry = JSON.parse(registryBytes) as SourceRegistry;
  const lock = JSON.parse(lockBytes) as SourceLock;
  validateSourceState(registry, lock);
  return { registry, lock };
}

function tarString(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8").replace(/\0.*$/, "");
}

function tarSize(header: Uint8Array): number {
  const raw = tarString(header.subarray(124, 136)).trim();
  if (!/^[0-7]*$/.test(raw))
    throw new SourceError("npm tarball has an invalid size field.");
  return raw ? Number.parseInt(raw, 8) : 0;
}

export function verifyNpmSri(bytes: Uint8Array, expected: string): void {
  const actual = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (actual !== expected)
    throw new SourceError("Managed npm tarball integrity mismatch.");
}

/** Strictly extracts regular files under the expected npm package prefix. */
export function extractNpmPackageTarball(
  bytes: Uint8Array,
): readonly { path: string; content: Uint8Array }[] {
  let archive: Uint8Array;
  try {
    archive = gunzipSync(bytes);
  } catch {
    throw new SourceError("npm tarball is not valid gzip data.");
  }
  const files: { path: string; content: Uint8Array }[] = [];
  let offset = 0;
  while (offset < archive.byteLength) {
    const header = archive.subarray(offset, offset + 512);
    if (header.byteLength !== 512)
      throw new SourceError("npm tarball has a truncated header.");
    if (header.every((byte) => byte === 0)) break;
    const name = tarString(header.subarray(0, 100));
    const prefix = tarString(header.subarray(345, 500));
    const path = prefix ? `${prefix}/${name}` : name;
    const type = String.fromCharCode(header[156] ?? 0);
    const size = tarSize(header);
    const bodyStart = offset + 512;
    const bodyEnd = bodyStart + size;
    if (bodyEnd > archive.byteLength)
      throw new SourceError("npm tarball has a truncated file.");
    offset = bodyStart + Math.ceil(size / 512) * 512;
    if (type === "5") continue;
    if (type !== "\0" && type !== "0")
      throw new SourceError("npm tarball contains a non-regular entry.");
    if (!path.startsWith("package/"))
      throw new SourceError("npm tarball file is outside package/.");
    const relative = path.slice("package/".length);
    if (!validateResourcePath(relative))
      throw new SourceError("npm tarball has an unsafe package path.");
    if (files.some((file) => file.path === relative))
      throw new SourceError("npm tarball has duplicate package paths.");
    files.push({ path: relative, content: archive.slice(bodyStart, bodyEnd) });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

/** Acquires and verifies the exact managed 21st npm package without lifecycle execution. */
export async function managedToolArtifacts(
  stateDir: string,
  client: HttpClient = createHttpsClient(),
): Promise<readonly DesiredArtifact[]> {
  const { registry, lock } = await sourceState();
  const declaration = registry.sources.find(
    (source) => source.id === "21st-cli",
  );
  const locked = lock.sources.find((source) => source.sourceId === "21st-cli");
  if (
    !declaration?.package ||
    declaration.version !== version ||
    !locked?.integrity
  )
    throw new SourceError("Locked 21st CLI metadata is unavailable.");
  const resolution = await resolveNpmPackage(
    client,
    declaration.package,
    version,
  );
  if (
    resolution.integrity !== locked.integrity ||
    resolution.license !== declaration.license.expected
  )
    throw new SourceError(
      "npm metadata does not match the locked 21st CLI identity.",
    );
  const tarball = await acquireNpmTarball(client, resolution);
  verifyNpmSri(tarball, locked.integrity);
  const files = extractNpmPackageTarball(tarball);
  if (
    files.map((file) => file.path).join("\n") !==
    [...expectedFiles].sort((a, b) => a.localeCompare(b)).join("\n")
  )
    throw new SourceError(
      "Managed 21st CLI package layout changed unexpectedly.",
    );
  const base = join(stateDir, "tools", "21st", version, "package");
  return [
    ...files.map((file) => ({
      id: `managed-tool.21st.${version}.${file.path.replaceAll("/", ".")}`,
      targetPath: join(base, file.path),
      content: file.content,
      ownership: "managed" as const,
      mode: file.path === "dist/index.js" ? 0o755 : 0o644,
    })),
    {
      id: "managed-tool.21st.launcher",
      targetPath: join(stateDir, "bin", "21st"),
      content:
        '#!/bin/sh\nexec node "$(dirname "$0")/../tools/21st/1.17.0/package/dist/index.js" "$@"\n',
      ownership: "managed" as const,
      mode: 0o755,
    },
  ];
}

export function managedToolStateRoots(stateDir: string): readonly string[] {
  return [join(stateDir, "tools"), join(stateDir, "bin")];
}
