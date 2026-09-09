const registry = "https://registry.npmjs.org";

export async function exactPackageVersionStatus(
  packageName,
  version,
  request = fetch,
) {
  const target = `${packageName}@${version}`;
  let response;
  try {
    response = await request(
      `${registry}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`,
      { headers: { accept: "application/json" } },
    );
  } catch (error) {
    throw new Error(
      `REGISTRY_CHECK_FAILED ${target}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (response.status === 200) return "published";
  if (response.status === 404) return "missing";
  throw new Error(`REGISTRY_CHECK_FAILED ${target}: HTTP ${response.status}`);
}

export function packageStatusMessage(packageName, version, status) {
  const target = `${packageName}@${version}`;
  return status === "published"
    ? `PACKAGE_ALREADY_PUBLISHED ${target}`
    : `PACKAGE_NOT_PUBLISHED ${target}`;
}

async function main() {
  const [packageName, version] = process.argv.slice(2);
  if (!packageName || !version)
    throw new Error("Usage: npm-version-status.mjs <package-name> <version>");
  const status = await exactPackageVersionStatus(packageName, version);
  console.log(packageStatusMessage(packageName, version, status));
  if (status === "published") process.exitCode = 10;
}

if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
