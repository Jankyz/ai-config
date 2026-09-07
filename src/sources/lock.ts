import {
  isSha256,
  SourceError,
  validateResourcePath,
  verifySha256,
} from "./integrity.js";
import {
  isExactNpmVersion,
  validateRegistry,
  type SourceRegistry,
} from "./registry.js";

export interface LicenseEvidence {
  readonly spdx: string;
  readonly path: string;
  readonly scope: "repository" | "resource";
  readonly digest: string;
}
export interface LockedSource {
  readonly sourceId: string;
  readonly kind: "github" | "npm";
  readonly commit?: string;
  readonly version?: string;
  readonly integrity?: string;
  readonly resources: readonly {
    readonly resourceId: string;
    readonly path?: string;
    readonly digest?: string;
    readonly license?: LicenseEvidence;
  }[];
  readonly license: LicenseEvidence;
  readonly resolvedAt: string;
}
export interface SourceLock {
  readonly schemaVersion: 1;
  readonly sources: readonly LockedSource[];
}
const sha = /^[0-9a-f]{40}$/;
const resourceId = /^[a-z0-9][a-z0-9-]*$/;
export function isValidSri(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  const lengths = { sha256: 32, sha384: 48, sha512: 64 } as const;
  return value
    .trim()
    .split(/\s+/)
    .every((part) => {
      const match = /^(sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/.exec(
        part,
      );
      if (!match) return false;
      const algorithm = match[1] as keyof typeof lengths;
      const encoded = match[2]!;
      const decoded = Buffer.from(encoded, "base64");
      return (
        decoded.byteLength === lengths[algorithm] &&
        decoded.toString("base64").replace(/=+$/, "") ===
          encoded.replace(/=+$/, "")
      );
    });
}
export function validateLock(lock: SourceLock): SourceLock {
  if (lock?.schemaVersion !== 1 || !Array.isArray(lock.sources))
    throw new SourceError("Unsupported source lock schema.");
  const ids = new Set<string>();
  for (const source of lock.sources) {
    if (!source || typeof source !== "object")
      throw new SourceError("Invalid locked source declaration.");
    if (!resourceId.test(source.sourceId) || ids.has(source.sourceId))
      throw new SourceError(
        `Invalid or duplicate locked source: ${source.sourceId}`,
      );
    ids.add(source.sourceId);
    if (source.kind !== "github" && source.kind !== "npm")
      throw new SourceError(
        `Unsupported locked source kind: ${String(source.kind)}`,
      );
    if (
      !source.license?.spdx ||
      !source.license.path ||
      !isSha256(source.license.digest) ||
      source.license.scope !== "repository"
    )
      throw new SourceError(
        `Locked source ${source.sourceId} lacks license evidence.`,
      );
    if (
      (source.kind === "github" &&
        !validateResourcePath(source.license.path)) ||
      (source.kind === "npm" && source.license.path !== "metadata:license")
    )
      throw new SourceError(
        `Locked source ${source.sourceId} has unsafe license evidence.`,
      );
    if (
      source.kind === "github" &&
      (!source.commit || !sha.test(source.commit))
    )
      throw new SourceError(
        `GitHub source ${source.sourceId} needs a full immutable commit SHA.`,
      );
    if (
      source.kind === "npm" &&
      (!isExactNpmVersion(source.version) || !isValidSri(source.integrity))
    )
      throw new SourceError(
        `npm source ${source.sourceId} needs exact version and integrity.`,
      );
    if (!Number.isFinite(Date.parse(source.resolvedAt)))
      throw new SourceError(`Invalid resolution time for ${source.sourceId}.`);
    const resources = new Set<string>();
    if (!Array.isArray(source.resources))
      throw new SourceError(
        `Locked source ${source.sourceId} resources are required.`,
      );
    for (const resource of source.resources) {
      if (!resource || typeof resource !== "object")
        throw new SourceError("Invalid locked resource declaration.");
      if (
        !resourceId.test(resource.resourceId) ||
        resources.has(resource.resourceId)
      )
        throw new SourceError(
          `Invalid or duplicate locked resource: ${resource.resourceId}`,
        );
      resources.add(resource.resourceId);
      if (resource.path !== undefined && !validateResourcePath(resource.path))
        throw new SourceError(`Unsafe locked resource path: ${resource.path}`);
      if (resource.path !== undefined && !isSha256(resource.digest))
        throw new SourceError(
          `Locked resource ${resource.resourceId} needs a SHA-256 digest.`,
        );
      if (resource.path === undefined && resource.digest !== undefined)
        throw new SourceError(
          `Locked resource ${resource.resourceId} has a digest without a path.`,
        );
      if (resource.license !== undefined) {
        if (
          !resource.license.spdx ||
          resource.license.scope !== "resource" ||
          !isSha256(resource.license.digest)
        )
          throw new SourceError(
            `Locked resource ${resource.resourceId} has invalid license evidence.`,
          );
        if (
          (source.kind === "github" &&
            !validateResourcePath(resource.license.path)) ||
          (source.kind === "npm" &&
            resource.license.path !== "metadata:license")
        )
          throw new SourceError(
            `Locked resource ${resource.resourceId} has unsafe license evidence.`,
          );
      }
    }
  }
  return lock;
}

export function verifyLicenseEvidence(
  source: LockedSource,
  evidenceBytes: Uint8Array,
): void {
  verifySha256(
    evidenceBytes,
    source.license.digest,
    `License evidence for ${source.sourceId}`,
  );
}

export function verifyLockedResourceDigest(
  source: LockedSource,
  resourceId: string,
  actualDigest: string,
): void {
  const resource = source.resources.find(
    (candidate) => candidate.resourceId === resourceId,
  );
  if (
    !resource ||
    !isSha256(resource.digest) ||
    resource.digest !== actualDigest
  )
    throw new SourceError(`Locked resource ${resourceId} SHA-256 mismatch.`);
}

export function verifyResourceLicenseEvidence(
  source: LockedSource,
  resourceId: string,
  evidenceBytes: Uint8Array,
): void {
  const resource = source.resources.find(
    (candidate) => candidate.resourceId === resourceId,
  );
  if (!resource?.license)
    throw new SourceError(
      `Locked resource ${resourceId} has no license override.`,
    );
  verifySha256(
    evidenceBytes,
    resource.license.digest,
    `License evidence for resource ${resourceId}`,
  );
}

/** Consumption gate: neither document is sufficient without exact correspondence to the other. */
export function validateSourceState(
  registry: SourceRegistry,
  lock: SourceLock,
): void {
  validateRegistry(registry);
  validateLock(lock);
  const lockedById = new Map(
    lock.sources.map((source) => [source.sourceId, source]),
  );
  for (const source of registry.sources) {
    const locked = lockedById.get(source.id);
    if (!locked) throw new SourceError(`Missing lock source: ${source.id}`);
    lockedById.delete(source.id);
    if (locked.kind !== source.kind)
      throw new SourceError(`Source kind mismatch: ${source.id}`);
    if (
      locked.license.spdx !== source.license.expected ||
      locked.license.scope !== source.license.scope ||
      locked.license.path !== source.license.evidence
    )
      throw new SourceError(`License mismatch: ${source.id}`);
    if (source.kind === "npm" && locked.version !== source.version)
      throw new SourceError(`npm version mismatch: ${source.id}`);
    const lockedResources = new Map(
      locked.resources.map((resource) => [resource.resourceId, resource]),
    );
    for (const resource of source.resources) {
      const resolved = lockedResources.get(resource.id);
      if (!resolved)
        throw new SourceError(`Missing locked resource: ${resource.id}`);
      lockedResources.delete(resource.id);
      if (resolved.path !== resource.path)
        throw new SourceError(`Resource path mismatch: ${resource.id}`);
      if (resource.mode !== "reference" && !isSha256(resolved.digest))
        throw new SourceError(
          `Consumable resource ${resource.id} needs a locked digest.`,
        );
      if (resource.license) {
        if (
          !resolved.license ||
          resolved.license.spdx !== resource.license.expected ||
          resolved.license.scope !== "resource" ||
          resolved.license.path !== resource.license.evidence
        )
          throw new SourceError(`Resource license mismatch: ${resource.id}`);
      } else if (resolved.license) {
        throw new SourceError(
          `Unexpected resource license override: ${resource.id}`,
        );
      }
    }
    if (lockedResources.size)
      throw new SourceError(
        `Unexpected locked resource: ${lockedResources.keys().next().value}`,
      );
  }
  if (lockedById.size)
    throw new SourceError(
      `Unexpected lock source: ${lockedById.keys().next().value}`,
    );
}
