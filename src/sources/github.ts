import {
  SourceError,
  treeDigest,
  type SourceFile,
  validateResourcePath,
} from "./integrity.js";
import { validateGitHubRepository } from "./registry.js";
import { gunzipSync } from "node:zlib";

export interface HttpResponse {
  readonly status: number;
  readonly body: Uint8Array;
}
export interface HttpClient {
  get(
    url: string,
    limit: number,
    options?: { readonly accept?: string },
  ): Promise<HttpResponse>;
}
export interface SourceLimits {
  readonly timeoutMs: number;
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
  readonly maxFiles: number;
}
export const defaultLimits: SourceLimits = {
  timeoutMs: 10_000,
  maxFileBytes: 2 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxFiles: 1_000,
};

export function createHttpsClient(
  timeoutMs = defaultLimits.timeoutMs,
  fetchImpl: typeof fetch = fetch,
): HttpClient {
  return {
    async get(url, limit, options) {
      if (!Number.isSafeInteger(limit) || limit < 0)
        throw new SourceError("Response limit must be a non-negative integer.");
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        ![
          "api.github.com",
          "codeload.github.com",
          "registry.npmjs.org",
        ].includes(parsed.hostname)
      )
        throw new SourceError("Only approved HTTPS source hosts are allowed.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(parsed, {
          headers: {
            accept: options?.accept ?? "application/vnd.github+json",
            "user-agent": "ai-config",
          },
          redirect: "error",
          signal: controller.signal,
        });
        const contentLength = response.headers.get("content-length");
        if (contentLength !== null && Number(contentLength) > limit) {
          controller.abort();
          await response.body?.cancel().catch(() => undefined);
          throw new SourceError("Remote response exceeds its size limit.");
        }
        if (!response.body)
          return { status: response.status, body: new Uint8Array() };
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            length += result.value.byteLength;
            if (length > limit) {
              controller.abort();
              await reader.cancel().catch(() => undefined);
              throw new SourceError("Remote response exceeds its size limit.");
            }
            chunks.push(result.value);
          }
        } finally {
          reader.releaseLock();
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return { status: response.status, body: bytes };
      } catch (error) {
        if (error instanceof SourceError) throw error;
        if (controller.signal.aborted)
          throw new SourceError("Remote request timed out or was aborted.");
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
const json = <T>(response: HttpResponse): T => {
  if (response.status < 200 || response.status >= 300)
    throw new SourceError(
      `GitHub request failed with status ${response.status}.`,
    );
  try {
    return JSON.parse(new TextDecoder().decode(response.body)) as T;
  } catch {
    throw new SourceError("GitHub response was not valid JSON.");
  }
};
const api = (repository: string, suffix: string) =>
  `https://api.github.com/repos/${repository}${suffix}`;

function requireGitObjectSha(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value))
    throw new SourceError(`Invalid GitHub ${field}.`);
}

export async function resolveGitHubRef(
  client: HttpClient,
  repository: string,
  trackingRef: string,
): Promise<string> {
  validateGitHubRepository(repository);
  if (!trackingRef || trackingRef.includes("\0"))
    throw new SourceError("Invalid GitHub tracking reference.");
  const data = json<{ sha?: unknown }>(
    await client.get(
      api(repository, `/commits/${encodeURIComponent(trackingRef)}`),
      128 * 1024,
    ),
  );
  if (typeof data.sha !== "string" || !/^[0-9a-f]{40}$/.test(data.sha))
    throw new SourceError("GitHub did not return a full commit SHA.");
  return data.sha;
}

/** Read-only comparison; callers must explicitly review and write any new lock. */
export async function checkGitHubUpdate(
  client: HttpClient,
  repository: string,
  trackingRef: string,
  lockedCommit: string,
): Promise<{
  readonly lockedCommit: string;
  readonly candidateCommit: string;
  readonly hasUpdate: boolean;
}> {
  validateGitHubRepository(repository);
  if (!/^[0-9a-f]{40}$/.test(lockedCommit))
    throw new SourceError("Update checks require a full locked commit SHA.");
  const candidateCommit = await resolveGitHubRef(
    client,
    repository,
    trackingRef,
  );
  return {
    lockedCommit,
    candidateCommit,
    hasUpdate: candidateCommit !== lockedCommit,
  };
}
export interface AcquiredResource {
  readonly commit: string;
  readonly path: string;
  readonly files: readonly SourceFile[];
  readonly digest: string;
}
interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  mode: string;
  sha: string;
  size?: number;
}
export async function acquireGitHubResource(
  client: HttpClient,
  repository: string,
  commit: string,
  resourcePath: string,
  limits: SourceLimits = defaultLimits,
): Promise<AcquiredResource> {
  validateGitHubRepository(repository);
  if (!/^[0-9a-f]{40}$/.test(commit) || !validateResourcePath(resourcePath))
    throw new SourceError(
      "GitHub resources require an immutable commit and safe path.",
    );
  const tree = json<{ tree?: TreeEntry[]; truncated?: boolean }>(
    await client.get(
      api(repository, `/git/trees/${commit}?recursive=1`),
      limits.maxTotalBytes,
    ),
  );
  if (tree.truncated || !Array.isArray(tree.tree))
    throw new SourceError("GitHub tree is incomplete.");
  const prefix = `${resourcePath}/`;
  const validatedTree = tree.tree.map((entry) => {
    if (!entry || typeof entry !== "object")
      throw new SourceError("Invalid GitHub tree entry.");
    if (!validateResourcePath(entry.path))
      throw new SourceError("Invalid GitHub tree path.");
    if (!["blob", "tree", "commit"].includes(entry.type))
      throw new SourceError(`Invalid GitHub tree type: ${String(entry.type)}`);
    if (typeof entry.mode !== "string" || !/^[0-7]{6}$/.test(entry.mode))
      throw new SourceError("Invalid GitHub tree mode.");
    requireGitObjectSha(entry.sha, "tree object SHA");
    if (
      entry.size !== undefined &&
      (!Number.isSafeInteger(entry.size) || entry.size < 0)
    )
      throw new SourceError("Invalid GitHub tree size.");
    return entry;
  });
  const entries = validatedTree.filter(
    (entry) => entry.path === resourcePath || entry.path.startsWith(prefix),
  );
  if (!entries.length)
    throw new SourceError(`Resource not found: ${resourcePath}`);
  if (
    entries.some((entry) => entry.type === "commit" || entry.mode === "120000")
  )
    throw new SourceError("Submodules and symlinks are unsupported.");
  const files = entries
    .filter((entry) => entry.type === "blob")
    .sort((a, b) => a.path.localeCompare(b.path));
  if (files.length > limits.maxFiles)
    throw new SourceError("Resource exceeds file-count limit.");
  let total = 0;
  const output: SourceFile[] = [];
  for (const entry of files) {
    if ((entry.size ?? 0) > limits.maxFileBytes)
      throw new SourceError(`File exceeds size limit: ${entry.path}`);
    requireGitObjectSha(entry.sha, "blob SHA");
    const response = await client.get(
      api(repository, `/git/blobs/${entry.sha}`),
      limits.maxFileBytes,
      { accept: "application/vnd.github.raw+json" },
    );
    if (response.status < 200 || response.status >= 300)
      throw new SourceError(
        `GitHub blob request failed with status ${response.status}.`,
      );
    const bytes = response.body;
    total += bytes.byteLength;
    if (bytes.byteLength > limits.maxFileBytes || total > limits.maxTotalBytes)
      throw new SourceError("Resource exceeds size limit.");
    const path =
      entry.path === resourcePath
        ? entry.path.split("/").at(-1)!
        : entry.path.slice(prefix.length);
    if (!validateResourcePath(path))
      throw new SourceError(`Unsafe tree path: ${entry.path}`);
    output.push({ path, bytes, mode: entry.mode });
  }
  return {
    commit,
    path: resourcePath,
    files: output,
    digest: treeDigest(output),
  };
}

function archiveString(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8").replace(/\0.*$/, "");
}

function archiveSize(header: Uint8Array): number {
  const raw = archiveString(header.subarray(124, 136)).trim();
  if (!/^[0-7]*$/.test(raw))
    throw new SourceError("GitHub archive has an invalid size field.");
  return raw ? Number.parseInt(raw, 8) : 0;
}

/** Acquires only requested immutable paths from a bounded codeload archive. */
export async function acquireGitHubArchiveResources(
  client: HttpClient,
  repository: string,
  commit: string,
  resourcePaths: readonly string[],
  limits: SourceLimits = defaultLimits,
): Promise<ReadonlyMap<string, AcquiredResource>> {
  validateGitHubRepository(repository);
  if (
    !/^[0-9a-f]{40}$/.test(commit) ||
    resourcePaths.length === 0 ||
    resourcePaths.some((path) => !validateResourcePath(path))
  )
    throw new SourceError(
      "GitHub archive acquisition requires immutable safe resource paths.",
    );
  const response = await client.get(
    `https://codeload.github.com/${repository}/tar.gz/${commit}`,
    limits.maxTotalBytes,
    { accept: "application/octet-stream" },
  );
  if (response.status < 200 || response.status >= 300)
    throw new SourceError(
      `GitHub archive request failed with status ${response.status}.`,
    );
  let archive: Uint8Array;
  try {
    archive =
      response.body[0] === 0x1f && response.body[1] === 0x8b
        ? gunzipSync(response.body, {
            // codeload archives include repository metadata outside the selected
            // resource; retain a bounded archive ceiling while materializing only
            // the normal per-resource limit below.
            maxOutputLength: 32 * 1024 * 1024,
          })
        : response.body;
  } catch {
    throw new SourceError("GitHub archive is not valid bounded gzip data.");
  }
  const prefix = `${repository.split("/")[1]}-${commit}/`;
  const selected = new Map(
    resourcePaths.map((path) => [path, [] as SourceFile[]]),
  );
  let offset = 0;
  while (offset < archive.byteLength) {
    const header = archive.subarray(offset, offset + 512);
    if (header.byteLength !== 512)
      throw new SourceError("GitHub archive has a truncated header.");
    if (header.every((byte) => byte === 0)) break;
    const name = archiveString(header.subarray(0, 100));
    const headerPrefix = archiveString(header.subarray(345, 500));
    const path = headerPrefix ? `${headerPrefix}/${name}` : name;
    const type = String.fromCharCode(header[156] ?? 0);
    const size = archiveSize(header);
    const bodyStart = offset + 512;
    const bodyEnd = bodyStart + size;
    if (bodyEnd > archive.byteLength)
      throw new SourceError("GitHub archive has a truncated file.");
    offset = bodyStart + Math.ceil(size / 512) * 512;
    if (!path.startsWith(prefix)) continue;
    const repositoryPath = path.slice(prefix.length).replace(/\/$/, "");
    for (const requested of resourcePaths) {
      if (
        repositoryPath !== requested &&
        !repositoryPath.startsWith(`${requested}/`)
      )
        continue;
      if (type === "5") break;
      if (type !== "\0" && type !== "0")
        throw new SourceError(
          "GitHub archive contains a non-regular requested entry.",
        );
      const relative =
        repositoryPath === requested
          ? requested.split("/").at(-1)!
          : repositoryPath.slice(requested.length + 1);
      if (!validateResourcePath(relative))
        throw new SourceError("GitHub archive has an unsafe requested path.");
      const files = selected.get(requested)!;
      if (files.some((file) => file.path === relative))
        throw new SourceError("GitHub archive has duplicate requested paths.");
      if (size > limits.maxFileBytes)
        throw new SourceError("GitHub archive file exceeds size limit.");
      files.push({
        path: relative,
        bytes: archive.slice(bodyStart, bodyEnd),
        mode:
          Number.parseInt(archiveString(header.subarray(100, 108)).trim(), 8) &
          0o100
            ? "100755"
            : "100644",
      });
      break;
    }
  }
  const result = new Map<string, AcquiredResource>();
  for (const [path, files] of selected) {
    const sorted = files.sort((left, right) =>
      left.path.localeCompare(right.path),
    );
    if (!sorted.length || sorted.length > limits.maxFiles)
      throw new SourceError(
        `GitHub archive resource is missing or exceeds file limit: ${path}`,
      );
    if (
      sorted.reduce((sum, file) => sum + file.bytes.byteLength, 0) >
      limits.maxTotalBytes
    )
      throw new SourceError(
        "GitHub archive resource exceeds total-size limit.",
      );
    result.set(path, {
      commit,
      path,
      files: sorted,
      digest: treeDigest(sorted),
    });
  }
  return result;
}
