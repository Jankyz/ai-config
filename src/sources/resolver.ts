import {
  acquireGitHubResource,
  resolveGitHubRef,
  type HttpClient,
  type SourceLimits,
} from "./github.js";
import { sha256, SourceError } from "./integrity.js";
import {
  validateSourceState,
  type LicenseEvidence,
  type LockedSource,
  type SourceLock,
} from "./lock.js";
import { resolveNpmPackage } from "./npm.js";
import {
  validateRegistry,
  type SourceDeclaration,
  type SourceRegistry,
} from "./registry.js";

function resolutionTime(now: Date): string {
  if (!Number.isFinite(now.getTime()))
    throw new SourceError("Resolution clock returned an invalid time.");
  return now.toISOString();
}

async function resolveGitHubLicense(
  client: HttpClient,
  repository: string,
  commit: string,
  policy: SourceDeclaration["license"],
  limits?: SourceLimits,
): Promise<LicenseEvidence> {
  const evidence = await acquireGitHubResource(
    client,
    repository,
    commit,
    policy.evidence,
    limits,
  );
  if (evidence.files.length !== 1)
    throw new SourceError(
      `License evidence must resolve to exactly one file: ${policy.evidence}`,
    );
  return {
    spdx: policy.expected,
    path: policy.evidence,
    scope: policy.scope,
    digest: sha256(evidence.files[0]!.bytes),
  };
}

/** Produces reviewable lock data only; it never writes the repository lock. */
export async function resolveSourceLock(
  source: SourceDeclaration,
  client: HttpClient,
  now: Date,
  limits?: SourceLimits,
): Promise<LockedSource> {
  validateRegistry({ schemaVersion: 1, sources: [source] });
  const resolvedAt = resolutionTime(now);
  if (source.kind === "github") {
    if (!source.repository || !source.track)
      throw new SourceError(
        `GitHub source ${source.id} needs a tracking reference.`,
      );
    const commit = await resolveGitHubRef(
      client,
      source.repository,
      source.track.value,
    );
    const license = await resolveGitHubLicense(
      client,
      source.repository,
      commit,
      source.license,
      limits,
    );
    const resources = [];
    for (const resource of [...source.resources].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      if (!resource.path) {
        resources.push({
          resourceId: resource.id,
          ...(resource.license
            ? {
                license: await resolveGitHubLicense(
                  client,
                  source.repository,
                  commit,
                  resource.license,
                  limits,
                ),
              }
            : {}),
        });
        continue;
      }
      const acquired = await acquireGitHubResource(
        client,
        source.repository,
        commit,
        resource.path,
        limits,
      );
      resources.push({
        resourceId: resource.id,
        path: resource.path,
        digest: acquired.digest,
        ...(resource.license
          ? {
              license: await resolveGitHubLicense(
                client,
                source.repository,
                commit,
                resource.license,
                limits,
              ),
            }
          : {}),
      });
    }
    return {
      sourceId: source.id,
      kind: "github",
      commit,
      resources,
      license,
      resolvedAt,
    };
  }
  const resolution = await resolveNpmPackage(
    client,
    source.package!,
    source.version!,
  );
  if (resolution.license !== source.license.expected)
    throw new SourceError(`npm license mismatch for ${source.id}.`);
  return {
    sourceId: source.id,
    kind: "npm",
    version: resolution.version,
    integrity: resolution.integrity,
    resources: [...source.resources]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((resource) => ({
        resourceId: resource.id,
        ...(resource.license
          ? {
              license: {
                spdx: resource.license.expected,
                path: resource.license.evidence,
                scope: resource.license.scope,
                digest: sha256(resolution.license),
              },
            }
          : {}),
      })),
    license: {
      spdx: source.license.expected,
      path: source.license.evidence,
      scope: source.license.scope,
      digest: sha256(resolution.license),
    },
    resolvedAt,
  };
}

export async function resolveRegistryLock(
  registry: SourceRegistry,
  client: HttpClient,
  clock: () => Date = () => new Date(),
  limits?: SourceLimits,
): Promise<SourceLock> {
  validateRegistry(registry);
  const sources: LockedSource[] = [];
  for (const source of [...registry.sources].sort((a, b) =>
    a.id.localeCompare(b.id),
  ))
    sources.push(await resolveSourceLock(source, client, clock(), limits));
  const candidate: SourceLock = { schemaVersion: 1, sources };
  validateSourceState(registry, candidate);
  return candidate;
}
