export interface EnvironmentInfo {
  readonly platform: NodeJS.Platform;
  readonly architecture: string;
  readonly runtime: { readonly name: "node" | "bun"; readonly version: string };
}

/** Reports runtime metadata only; resolving an install home is an orchestration concern. */
export function detectEnvironment(): EnvironmentInfo {
  const bunRuntime = (
    globalThis as typeof globalThis & { Bun?: { version: string } }
  ).Bun;
  const bun = bunRuntime !== undefined;
  return {
    platform: process.platform,
    architecture: process.arch,
    runtime: {
      name: bun ? "bun" : "node",
      version: bun ? bunRuntime.version : process.version,
    },
  };
}
