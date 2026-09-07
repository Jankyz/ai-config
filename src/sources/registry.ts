import { SourceError, validateResourcePath } from "./integrity.js";

export type SourceKind = "github" | "npm";
export type ResourceMode =
  "reference" | "external-managed" | "vendored" | "adapted";
export interface LicensePolicy {
  readonly expected: string;
  readonly scope: "repository" | "resource";
  readonly evidence: string;
}
export interface SourceResource {
  readonly id: string;
  readonly path?: string;
  readonly mode: ResourceMode;
  readonly localPath?: string;
  readonly installable?: boolean;
  readonly license?: LicensePolicy;
}
export interface SourceDeclaration {
  readonly id: string;
  readonly kind: SourceKind;
  readonly repository?: string;
  readonly package?: string;
  readonly version?: string;
  readonly track?: { readonly type: "branch" | "tag"; readonly value: string };
  readonly license: LicensePolicy;
  readonly resources: readonly SourceResource[];
}
export interface SourceRegistry {
  readonly schemaVersion: 1;
  readonly sources: readonly SourceDeclaration[];
}

const id = /^[a-z0-9][a-z0-9-]*$/;
const repository = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function isExactNpmVersion(value: unknown): value is string {
  return typeof value === "string" && exactVersion.test(value);
}

export function validateGitHubRepository(
  value: unknown,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !repository.test(value) ||
    value.split("/").some((part) => part === "." || part === "..")
  )
    throw new SourceError(`Invalid GitHub repository: ${String(value ?? "")}`);
}

export function validateRegistry(registry: SourceRegistry): SourceRegistry {
  if (registry?.schemaVersion !== 1 || !Array.isArray(registry.sources))
    throw new SourceError("Unsupported source registry schema.");
  const sourceIds = new Set<string>();
  const resourceIds = new Set<string>();
  for (const source of registry.sources) {
    if (!source || typeof source !== "object")
      throw new SourceError("Invalid source declaration.");
    if (!id.test(source.id) || sourceIds.has(source.id))
      throw new SourceError(`Invalid or duplicate source ID: ${source.id}`);
    sourceIds.add(source.id);
    if (source.kind !== "github" && source.kind !== "npm")
      throw new SourceError(`Unsupported source kind: ${String(source.kind)}`);
    if (
      !source.license?.expected ||
      !source.license.evidence ||
      source.license.scope !== "repository"
    )
      throw new SourceError(
        `Source ${source.id} needs an explicit license policy.`,
      );
    if (!Array.isArray(source.resources))
      throw new SourceError(`Source ${source.id} resources are required.`);
    if (source.kind === "github") {
      validateGitHubRepository(source.repository);
      if (
        !source.track ||
        !["branch", "tag"].includes(source.track.type) ||
        !source.track.value ||
        source.track.value.includes("\0")
      )
        throw new SourceError(
          `GitHub source ${source.id} needs a valid tracking reference.`,
        );
      if (!validateResourcePath(source.license.evidence))
        throw new SourceError(
          `Unsafe license evidence path: ${source.license.evidence}`,
        );
      if (source.version || source.package)
        throw new SourceError(`GitHub source ${source.id} has npm fields.`);
    } else {
      if (!source.package || !isExactNpmVersion(source.version))
        throw new SourceError(
          `npm source ${source.id} requires an exact package version.`,
        );
      if (source.license.evidence !== "metadata:license")
        throw new SourceError(
          `npm source ${source.id} must use metadata:license evidence.`,
        );
    }
    for (const resource of source.resources) {
      if (!resource || typeof resource !== "object")
        throw new SourceError("Invalid resource declaration.");
      if (!id.test(resource.id) || resourceIds.has(resource.id))
        throw new SourceError(
          `Invalid or duplicate resource ID: ${resource.id}`,
        );
      resourceIds.add(resource.id);
      if (
        !["reference", "external-managed", "vendored", "adapted"].includes(
          resource.mode,
        )
      )
        throw new SourceError(
          `Unsupported resource mode: ${String(resource.mode)}`,
        );
      if (resource.path !== undefined && !validateResourcePath(resource.path))
        throw new SourceError(`Unsafe resource path: ${resource.path}`);
      if (resource.license !== undefined) {
        if (
          !resource.license.expected ||
          resource.license.scope !== "resource" ||
          !resource.license.evidence
        )
          throw new SourceError(
            `Resource ${resource.id} has an invalid license override.`,
          );
        if (
          source.kind === "github" &&
          !validateResourcePath(resource.license.evidence)
        )
          throw new SourceError(
            `Resource ${resource.id} has an unsafe license evidence path.`,
          );
        if (
          source.kind === "npm" &&
          resource.license.evidence !== "metadata:license"
        )
          throw new SourceError(
            `npm resource ${resource.id} must use metadata:license evidence.`,
          );
      }
      if (
        resource.localPath !== undefined &&
        !validateResourcePath(resource.localPath)
      )
        throw new SourceError(
          `Unsafe local resource path: ${resource.localPath}`,
        );
      if (source.kind === "npm" && resource.mode !== "reference")
        throw new SourceError(`npm resources are metadata-only in Phase 7.`);
      switch (resource.mode) {
        case "reference":
          if (resource.installable === true || resource.localPath)
            throw new SourceError(
              `Reference resource ${resource.id} is not installable or local.`,
            );
          break;
        case "external-managed":
          if (
            !resource.path ||
            resource.installable !== true ||
            resource.localPath
          )
            throw new SourceError(
              `External-managed resource ${resource.id} needs only an installable upstream path.`,
            );
          break;
        case "vendored":
        case "adapted":
          if (
            !resource.path ||
            !resource.localPath ||
            resource.installable === true
          )
            throw new SourceError(
              `${resource.mode} resource ${resource.id} needs upstream and local paths and is not directly installable.`,
            );
          break;
      }
    }
  }
  return registry;
}
