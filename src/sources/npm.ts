import { SourceError } from "./integrity.js";
import { isExactNpmVersion } from "./registry.js";
import type { HttpClient } from "./github.js";
import { isValidSri } from "./lock.js";

export interface NpmResolution {
  readonly package: string;
  readonly version: string;
  readonly integrity: string;
  readonly tarball?: string;
  readonly license: string;
}
export async function resolveNpmPackage(
  client: HttpClient,
  packageName: string,
  version: string,
): Promise<NpmResolution> {
  if (!packageName || !isExactNpmVersion(version))
    throw new SourceError("npm resolution requires an exact version.");
  const safe = encodeURIComponent(packageName);
  const response = await client.get(
    `https://registry.npmjs.org/${safe}/${encodeURIComponent(version)}`,
    512 * 1024,
  );
  if (response.status === 404)
    throw new SourceError(
      `npm package version not found: ${packageName}@${version}`,
    );
  if (response.status < 200 || response.status >= 300)
    throw new SourceError(
      `npm registry request failed with status ${response.status}.`,
    );
  let data: {
    version?: unknown;
    dist?: { integrity?: unknown; tarball?: unknown };
    license?: unknown;
  };
  try {
    data = JSON.parse(new TextDecoder().decode(response.body));
  } catch {
    throw new SourceError("npm registry response was not valid JSON.");
  }
  if (data.version !== version || !isValidSri(data.dist?.integrity))
    throw new SourceError(
      "npm registry response lacks exact integrity metadata.",
    );
  const license =
    typeof data.license === "string"
      ? data.license
      : typeof data.license === "object" &&
          data.license !== null &&
          "type" in data.license &&
          typeof data.license.type === "string"
        ? data.license.type
        : undefined;
  if (!license)
    throw new SourceError("npm registry response lacks license metadata.");
  return {
    package: packageName,
    version,
    integrity: data.dist.integrity,
    license,
    ...(typeof data.dist.tarball === "string"
      ? { tarball: data.dist.tarball }
      : {}),
  };
}
