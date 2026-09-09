import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  acquireGitHubResource,
  checkGitHubUpdate,
  createHttpsClient,
  diffResources,
  resolveNpmPackage,
  resolveRegistryLock,
  resolveSourceLock,
  sha256,
  SourceError,
  treeDigest,
  validateLock,
  validateRegistry,
  validateResourcePath,
  validateSourceState,
  verifyLicenseEvidence,
  verifyLockedResourceDigest,
  verifyResourceLicenseEvidence,
  isValidSri,
  type HttpClient,
  type SourceLock,
  type SourceRegistry,
} from "../../src/sources/index.js";

const jsonBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const gitSha = (character: string) => character.repeat(40);
const sri = `sha512-${Buffer.alloc(64, 1).toString("base64")}`;
const digest = "d".repeat(64);

function client(responses: Record<string, unknown | Uint8Array>): HttpClient {
  return {
    async get(url, _limit, options) {
      const value = responses[url];
      if (value === undefined) return { status: 404, body: jsonBytes({}) };
      if (options?.accept === "application/vnd.github.raw+json") {
        if (!(value instanceof Uint8Array))
          throw new Error(`Expected raw fixture for ${url}`);
        return { status: 200, body: value };
      }
      return {
        status: 200,
        body: value instanceof Uint8Array ? value : jsonBytes(value),
      };
    },
  };
}

function registrySource(overrides: Record<string, unknown> = {}) {
  return {
    id: "example",
    kind: "github" as const,
    repository: "owner/repo",
    track: { type: "branch" as const, value: "main" },
    license: {
      expected: "MIT",
      scope: "repository" as const,
      evidence: "LICENSE",
    },
    resources: [
      {
        id: "resource",
        path: "skill",
        mode: "external-managed" as const,
        installable: true,
      },
    ],
    ...overrides,
  };
}

function matchingState(): { registry: SourceRegistry; lock: SourceLock } {
  return {
    registry: { schemaVersion: 1, sources: [registrySource()] },
    lock: {
      schemaVersion: 1,
      sources: [
        {
          sourceId: "example",
          kind: "github",
          commit: gitSha("a"),
          resources: [{ resourceId: "resource", path: "skill", digest }],
          license: {
            spdx: "MIT",
            path: "LICENSE",
            scope: "repository",
            digest,
          },
          resolvedAt: "2026-09-07T12:34:56.000Z",
        },
      ],
    },
  };
}

describe("external source validation", () => {
  it("pins only the approved adapted 21st resources for Phase 8", async () => {
    const [registryBytes, lockBytes, notices, license] = await Promise.all([
      readFile("upstream/registry.json", "utf8"),
      readFile("upstream/lock.json", "utf8"),
      readFile("THIRD_PARTY_NOTICES.md", "utf8"),
      readFile("third_party/21st/LICENSE"),
    ]);
    const registry = JSON.parse(registryBytes) as SourceRegistry;
    const lock = JSON.parse(lockBytes) as SourceLock;
    expect(() => validateSourceState(registry, lock)).not.toThrow();
    const source = registry.sources.find((item) => item.id === "21st-skill");
    const locked = lock.sources.find((item) => item.sourceId === "21st-skill");
    expect(source).toMatchObject({
      repository: "21st-dev/skill",
      license: { expected: "Apache-2.0", evidence: "LICENSE" },
      resources: [
        {
          id: "21st-cli-use",
          path: "skills/21st-cli-use",
          mode: "adapted",
          localPath: "skills/aic-ui-components",
        },
        {
          id: "21st-ai",
          path: "skills/21st-ai",
          mode: "adapted",
          localPath: "skills/aic-ui-generate",
        },
      ],
    });
    expect(locked).toMatchObject({
      commit: "0d77001a77fe8540bb07ed68d09092ee08546ed3",
      license: {
        spdx: "Apache-2.0",
        digest:
          "ac17c29e5529b0d977b8521353838c06c46f814d83de12da221418d62102de6f",
      },
      resources: [
        {
          resourceId: "21st-ai",
          digest:
            "e0723d6d7e89f8102b7b1c83b7f2a0ef258064c56de8ede3035151d662c1b5c2",
        },
        {
          resourceId: "21st-cli-use",
          digest:
            "ff6cfafea60d8fdbea8df71c1ef0f114f2c60077dac1892696bb0822407deaf1",
        },
      ],
    });
    expect(notices).toContain("21st-dev/skill");
    expect(notices).toContain("third_party/21st/LICENSE");
    expect(notices).not.toMatch(/Oh My Codex|Yeachan-Heo/);
    expect(sha256(license)).toBe(
      "ac17c29e5529b0d977b8521353838c06c46f814d83de12da221418d62102de6f",
    );
    expect(notices).toContain("No upstream `NOTICE` file exists");
    for (const path of [
      "skills/aic-ui-components/SKILL.md",
      "skills/aic-ui-generate/SKILL.md",
    ])
      await expect(readFile(path, "utf8")).resolves.toContain(
        "Distributed under Apache-2.0; see `third_party/21st/LICENSE`.",
      );
    expect(
      registry.sources.find((item) => item.id === "oh-my-codex"),
    ).toBeUndefined();
    expect(
      registry.sources.find((item) => item.id === "21st-cli"),
    ).toMatchObject({
      kind: "npm",
      package: "@21st-dev/cli",
      version: "1.17.0",
    });
    expect(
      registry.sources.find((item) => item.id === "ui-ux-pro-max"),
    ).toMatchObject({
      repository: "nextlevelbuilder/ui-ux-pro-max-skill",
      resources: [{ id: "ui-ux-pro-max-core", mode: "external-managed" }],
    });
  });

  it("rejects actual NUL, traversal, and absolute resource paths", () => {
    expect(validateResourcePath("safe/path")).toBe(true);
    expect(validateResourcePath("safe\0path")).toBe(false);
    expect(validateResourcePath("../escape")).toBe(false);
    expect(validateResourcePath("/absolute")).toBe(false);
    expect(validateResourcePath("safe\\..\\escape")).toBe(false);
  });

  it("enforces every resource mode invariant and safe local paths", () => {
    expect(
      validateRegistry({ schemaVersion: 1, sources: [registrySource()] })
        .sources,
    ).toHaveLength(1);
    expect(() =>
      validateRegistry({
        schemaVersion: 1,
        sources: [
          registrySource({
            resources: [
              { id: "reference", mode: "reference", installable: true },
            ],
          }),
        ],
      }),
    ).toThrow(/not installable/i);
    expect(() =>
      validateRegistry({
        schemaVersion: 1,
        sources: [
          registrySource({
            resources: [
              {
                id: "vendor",
                mode: "vendored",
                path: "skill",
                localPath: "../escape",
              },
            ],
          }),
        ],
      }),
    ).toThrow(/local resource path/i);
    expect(() =>
      validateRegistry({
        schemaVersion: 1,
        sources: [
          registrySource({
            resources: [{ id: "adapted", mode: "adapted", path: "skill" }],
          }),
        ],
      }),
    ).toThrow(/upstream and local paths/i);
  });

  it("validates locked resource digests, IDs, paths, and npm SRI", () => {
    const state = matchingState();
    expect(validateLock(state.lock)).toBe(state.lock);
    const source = state.lock.sources[0]!;
    expect(() =>
      validateLock({
        schemaVersion: 1,
        sources: [
          { ...source, resources: [{ resourceId: "", path: "skill", digest }] },
        ],
      }),
    ).toThrow(/locked resource/i);
    expect(() =>
      validateLock({
        schemaVersion: 1,
        sources: [
          {
            ...source,
            resources: [{ resourceId: "resource", path: "../bad", digest }],
          },
        ],
      }),
    ).toThrow(/path/i);
    expect(() =>
      validateLock({
        schemaVersion: 1,
        sources: [
          {
            sourceId: "npm",
            kind: "npm",
            version: "1.2.3",
            integrity: "anything",
            resources: [],
            license: { ...source.license, path: "metadata:license" },
            resolvedAt: source.resolvedAt,
          },
        ],
      }),
    ).toThrow(/integrity/i);
    expect(() =>
      verifyLockedResourceDigest(source, "resource", "e".repeat(64)),
    ).toThrow(/mismatch/i);
  });

  it("validates registry and lock correspondence as one consumption gate", () => {
    const { registry, lock } = matchingState();
    expect(() => validateSourceState(registry, lock)).not.toThrow();
    expect(() =>
      validateSourceState(
        {
          ...registry,
          sources: [
            ...registry.sources,
            registrySource({
              id: "missing",
              resources: [{ id: "missing-ref", mode: "reference" }],
            }),
          ],
        },
        lock,
      ),
    ).toThrow(/missing lock source/i);
    expect(() =>
      validateSourceState(registry, {
        ...lock,
        sources: [...lock.sources, { ...lock.sources[0]!, sourceId: "extra" }],
      }),
    ).toThrow(/unexpected lock source/i);
    expect(() =>
      validateSourceState(registry, {
        ...lock,
        sources: [
          {
            ...lock.sources[0]!,
            kind: "npm",
            version: "1.2.3",
            integrity: sri,
            license: {
              ...lock.sources[0]!.license,
              path: "metadata:license",
            },
          },
        ],
      }),
    ).toThrow(/kind mismatch/i);
    expect(() =>
      validateSourceState(registry, {
        ...lock,
        sources: [
          {
            ...lock.sources[0]!,
            license: { ...lock.sources[0]!.license, spdx: "Apache-2.0" },
          },
        ],
      }),
    ).toThrow(/license mismatch/i);
    const npmRegistry: SourceRegistry = {
      schemaVersion: 1,
      sources: [
        {
          id: "npm",
          kind: "npm",
          package: "pkg",
          version: "1.2.3",
          license: {
            expected: "MIT",
            scope: "repository",
            evidence: "metadata:license",
          },
          resources: [{ id: "npm-ref", mode: "reference" }],
        },
      ],
    };
    const npmLock: SourceLock = {
      schemaVersion: 1,
      sources: [
        {
          sourceId: "npm",
          kind: "npm",
          version: "1.2.4",
          integrity: sri,
          resources: [{ resourceId: "npm-ref" }],
          license: {
            spdx: "MIT",
            path: "metadata:license",
            scope: "repository",
            digest,
          },
          resolvedAt: "2026-09-07T12:34:56.000Z",
        },
      ],
    };
    expect(() => validateSourceState(npmRegistry, npmLock)).toThrow(
      /version mismatch/i,
    );
    expect(() =>
      validateSourceState(registry, {
        ...lock,
        sources: [{ ...lock.sources[0]!, resources: [] }],
      }),
    ).toThrow(/missing locked resource/i);
  });

  it("maps inherited and overridden resource licenses unambiguously", () => {
    const source = registrySource({
      resources: [
        {
          id: "inherited",
          path: "skills/inherited",
          mode: "external-managed",
          installable: true,
        },
        {
          id: "overridden",
          path: "skills/overridden",
          mode: "external-managed",
          installable: true,
          license: {
            expected: "Apache-2.0",
            scope: "resource",
            evidence: "skills/overridden/LICENSE",
          },
        },
      ],
    });
    const registry: SourceRegistry = { schemaVersion: 1, sources: [source] };
    const overrideLicense = {
      spdx: "Apache-2.0",
      scope: "resource" as const,
      path: "skills/overridden/LICENSE",
      digest: sha256("resource license"),
    };
    const lock: SourceLock = {
      schemaVersion: 1,
      sources: [
        {
          ...matchingState().lock.sources[0]!,
          resources: [
            {
              resourceId: "inherited",
              path: "skills/inherited",
              digest,
            },
            {
              resourceId: "overridden",
              path: "skills/overridden",
              digest,
              license: overrideLicense,
            },
          ],
        },
      ],
    };
    expect(() => validateSourceState(registry, lock)).not.toThrow();
    expect(() =>
      validateSourceState(registry, {
        ...lock,
        sources: [
          {
            ...lock.sources[0]!,
            resources: [
              lock.sources[0]!.resources[0]!,
              {
                ...lock.sources[0]!.resources[1]!,
                license: { ...overrideLicense, spdx: "MIT" },
              },
            ],
          },
        ],
      }),
    ).toThrow(/resource license mismatch/i);
    expect(() =>
      validateSourceState(registry, {
        ...lock,
        sources: [
          {
            ...lock.sources[0]!,
            resources: [
              lock.sources[0]!.resources[0]!,
              {
                ...lock.sources[0]!.resources[1]!,
                license: { ...overrideLicense, path: "OTHER-LICENSE" },
              },
            ],
          },
        ],
      }),
    ).toThrow(/resource license mismatch/i);
    expect(() =>
      verifyResourceLicenseEvidence(
        lock.sources[0]!,
        "overridden",
        Buffer.from("changed"),
      ),
    ).toThrow(/mismatch/i);
  });
});

describe("bounded HTTP acquisition", () => {
  it("aborts an oversized stream before consuming the complete body", async () => {
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          controller.enqueue(new TextEncoder().encode("abc"));
          if (pulls === 3) controller.close();
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const fakeFetch = async () => new Response(body, { status: 200 });
    const http = createHttpsClient(1_000, fakeFetch as typeof fetch);
    await expect(http.get("https://api.github.com/test", 4)).rejects.toThrow(
      /size limit/i,
    );
    expect(pulls).toBeLessThan(3);
    expect(cancelled).toBe(true);
  });

  it("handles a missing response body and keeps host and redirect policy bounded", async () => {
    const fakeFetch = async (_input: URL | RequestInfo, init?: RequestInit) => {
      expect(init?.redirect).toBe("error");
      return new Response(null, { status: 204 });
    };
    const http = createHttpsClient(1_000, fakeFetch as typeof fetch);
    await expect(http.get("https://api.github.com/test", 1)).resolves.toEqual({
      status: 204,
      body: new Uint8Array(),
    });
    await expect(http.get("https://example.com/test", 1)).rejects.toThrow(
      /approved HTTPS/i,
    );
  });
});

describe("GitHub and npm resolution", () => {
  it("validates repositories, tree metadata, and immutable update candidates", async () => {
    const sha = gitSha("a");
    const github = client({
      "https://api.github.com/repos/owner/repo/commits/main": { sha },
    });
    await expect(
      checkGitHubUpdate(github, "owner/repo", "main", gitSha("b")),
    ).resolves.toMatchObject({ candidateCommit: sha, hasUpdate: true });
    await expect(
      checkGitHubUpdate(github, "owner/repo?bad", "main", gitSha("b")),
    ).rejects.toThrow(/repository/i);
    const invalid = client({
      [`https://api.github.com/repos/owner/repo/git/trees/${sha}?recursive=1`]:
        {
          tree: [
            {
              path: "skill/a",
              type: "blob",
              mode: "100644",
              sha: "short",
              size: 1,
            },
          ],
        },
    });
    await expect(
      acquireGitHubResource(invalid, "owner/repo", sha, "skill"),
    ).rejects.toThrow(SourceError);
  });

  it("uses raw blobs and accepts the exact maximum while rejecting decoded overflow", async () => {
    const commit = gitSha("b");
    const blob = gitSha("c");
    const base = "https://api.github.com/repos/owner/repo";
    const near = Buffer.from("1234");
    const exact = client({
      [`${base}/git/trees/${commit}?recursive=1`]: {
        tree: [
          {
            path: "skill/file",
            type: "blob",
            mode: "100644",
            sha: blob,
            size: 4,
          },
        ],
      },
      [`${base}/git/blobs/${blob}`]: near,
    });
    await expect(
      acquireGitHubResource(exact, "owner/repo", commit, "skill", {
        timeoutMs: 1_000,
        maxFileBytes: 4,
        maxTotalBytes: 4,
        maxFiles: 1,
      }),
    ).resolves.toMatchObject({ files: [{ bytes: near }] });
    const over = client({
      [`${base}/git/trees/${commit}?recursive=1`]: {
        tree: [
          {
            path: "skill/file",
            type: "blob",
            mode: "100644",
            sha: blob,
            size: 5,
          },
        ],
      },
      [`${base}/git/blobs/${blob}`]: Buffer.from("12345"),
    });
    await expect(
      acquireGitHubResource(over, "owner/repo", commit, "skill", {
        timeoutMs: 1_000,
        maxFileBytes: 4,
        maxTotalBytes: 8,
        maxFiles: 1,
      }),
    ).rejects.toThrow(/size limit/i);
  });

  it("requires exact npm metadata, valid SRI, and declared license", async () => {
    const npm = client({
      "https://registry.npmjs.org/%40scope%2Fpkg/1.2.3": {
        version: "1.2.3",
        dist: { integrity: sri },
        license: "MIT",
      },
    });
    await expect(
      resolveNpmPackage(npm, "@scope/pkg", "1.2.3"),
    ).resolves.toMatchObject({ integrity: sri, license: "MIT" });
    await expect(
      resolveNpmPackage(npm, "@scope/pkg", "latest"),
    ).rejects.toThrow(SourceError);
  });

  it("validates SRI algorithm digest lengths", () => {
    expect(isValidSri(`sha256-${Buffer.alloc(32).toString("base64")}`)).toBe(
      true,
    );
    expect(isValidSri(`sha384-${Buffer.alloc(48).toString("base64")}`)).toBe(
      true,
    );
    expect(isValidSri(sri)).toBe(true);
    expect(
      isValidSri(`sha512-${Buffer.from("too short").toString("base64")}`),
    ).toBe(false);
    expect(
      isValidSri(`sha256-${Buffer.alloc(32).toString("base64")} ${sri}`),
    ).toBe(true);
  });

  it("resolves complete GitHub provenance with an injected timestamp", async () => {
    const commit = gitSha("e");
    const licenseSha = gitSha("f");
    const resourceSha = gitSha("1");
    const base = "https://api.github.com/repos/owner/repo";
    const remote = client({
      [`${base}/commits/main`]: { sha: commit },
      [`${base}/git/trees/${commit}?recursive=1`]: {
        tree: [
          {
            path: "LICENSE",
            type: "blob",
            mode: "100644",
            sha: licenseSha,
            size: 3,
          },
          { path: "skill", type: "tree", mode: "040000", sha: gitSha("2") },
          {
            path: "skill/a",
            type: "blob",
            mode: "100644",
            sha: resourceSha,
            size: 1,
          },
        ],
      },
      [`${base}/git/blobs/${licenseSha}`]: Buffer.from("MIT"),
      [`${base}/git/blobs/${resourceSha}`]: Buffer.from("a"),
    });
    const resolved = await resolveSourceLock(
      registrySource(),
      remote,
      new Date("2026-09-07T12:34:56.789Z"),
    );
    expect(resolved).toMatchObject({
      commit,
      resolvedAt: "2026-09-07T12:34:56.789Z",
      license: { digest: sha256("MIT") },
      resources: [{ resourceId: "resource", path: "skill" }],
    });
    expect(resolved.resources[0]!.digest).toBe(
      treeDigest([{ path: "a", bytes: Buffer.from("a"), mode: "100644" }]),
    );
  });

  it("resolves complete npm provenance with an injected timestamp", async () => {
    const source = {
      id: "npm",
      kind: "npm" as const,
      package: "@scope/pkg",
      version: "1.2.3",
      license: {
        expected: "MIT",
        scope: "repository" as const,
        evidence: "metadata:license",
      },
      resources: [{ id: "npm-reference", mode: "reference" as const }],
    };
    const remote = client({
      "https://registry.npmjs.org/%40scope%2Fpkg/1.2.3": {
        version: "1.2.3",
        dist: { integrity: sri },
        license: "MIT",
      },
    });
    await expect(
      resolveSourceLock(source, remote, new Date("2026-09-07T12:34:56.789Z")),
    ).resolves.toMatchObject({
      sourceId: "npm",
      version: "1.2.3",
      integrity: sri,
      resolvedAt: "2026-09-07T12:34:56.789Z",
      license: { digest: sha256("MIT") },
      resources: [{ resourceId: "npm-reference" }],
    });
  });

  it("resolves two resources with inherited and distinct effective licenses", async () => {
    const commit = gitSha("3");
    const base = "https://api.github.com/repos/owner/repo";
    const licenseSha = gitSha("4");
    const overrideSha = gitSha("5");
    const inheritedSha = gitSha("6");
    const overriddenSha = gitSha("7");
    const source = registrySource({
      resources: [
        {
          id: "inherited",
          path: "skills/inherited",
          mode: "external-managed",
          installable: true,
        },
        {
          id: "overridden",
          path: "skills/overridden",
          mode: "external-managed",
          installable: true,
          license: {
            expected: "Apache-2.0",
            scope: "resource",
            evidence: "skills/overridden/LICENSE",
          },
        },
      ],
    });
    const remote = client({
      [`${base}/commits/main`]: { sha: commit },
      [`${base}/git/trees/${commit}?recursive=1`]: {
        tree: [
          {
            path: "LICENSE",
            type: "blob",
            mode: "100644",
            sha: licenseSha,
            size: 3,
          },
          {
            path: "skills/inherited",
            type: "blob",
            mode: "100644",
            sha: inheritedSha,
            size: 1,
          },
          {
            path: "skills/overridden",
            type: "tree",
            mode: "040000",
            sha: gitSha("8"),
          },
          {
            path: "skills/overridden/file",
            type: "blob",
            mode: "100644",
            sha: overriddenSha,
            size: 1,
          },
          {
            path: "skills/overridden/LICENSE",
            type: "blob",
            mode: "100644",
            sha: overrideSha,
            size: 6,
          },
        ],
      },
      [`${base}/git/blobs/${licenseSha}`]: Buffer.from("MIT"),
      [`${base}/git/blobs/${overrideSha}`]: Buffer.from("Apache"),
      [`${base}/git/blobs/${inheritedSha}`]: Buffer.from("i"),
      [`${base}/git/blobs/${overriddenSha}`]: Buffer.from("o"),
    });
    const resolved = await resolveSourceLock(
      source,
      remote,
      new Date("2026-09-07T12:34:56.789Z"),
    );
    expect(resolved.license.spdx).toBe("MIT");
    expect(
      resolved.resources.find((item) => item.resourceId === "inherited")
        ?.license,
    ).toBeUndefined();
    expect(
      resolved.resources.find((item) => item.resourceId === "overridden")
        ?.license,
    ).toMatchObject({
      spdx: "Apache-2.0",
      scope: "resource",
      path: "skills/overridden/LICENSE",
      digest: sha256("Apache"),
    });
  });

  it("self-validates a complete registry lock candidate before returning", async () => {
    const source = {
      id: "npm",
      kind: "npm" as const,
      package: "pkg",
      version: "1.2.3",
      license: {
        expected: "MIT",
        scope: "repository" as const,
        evidence: "metadata:license",
      },
      resources: [{ id: "npm-reference", mode: "reference" as const }],
    };
    const remote = client({
      "https://registry.npmjs.org/pkg/1.2.3": {
        version: "1.2.3",
        dist: { integrity: sri },
        license: "MIT",
      },
    });
    const registry: SourceRegistry = { schemaVersion: 1, sources: [source] };
    const candidate = await resolveRegistryLock(
      registry,
      remote,
      () => new Date("2026-09-07T12:34:56.789Z"),
    );
    expect(() => validateSourceState(registry, candidate)).not.toThrow();
  });

  it("rejects license evidence bytes that differ from the pinned digest", () => {
    const { lock } = matchingState();
    const source = {
      ...lock.sources[0]!,
      license: { ...lock.sources[0]!.license, digest: sha256("MIT") },
    };
    expect(() =>
      verifyLicenseEvidence(source, Buffer.from("MIT")),
    ).not.toThrow();
    expect(() => verifyLicenseEvidence(source, Buffer.from("changed"))).toThrow(
      /mismatch/i,
    );
  });
});

describe("deterministic resource diff", () => {
  it("reports added, removed, changed, unchanged, and license change", () => {
    const oldFiles = [
      { path: "same", bytes: Buffer.from("x") },
      { path: "changed", bytes: Buffer.from("a") },
      { path: "removed", bytes: Buffer.from("r") },
    ];
    const newFiles = [
      { path: "same", bytes: Buffer.from("x") },
      { path: "changed", bytes: Buffer.from("b") },
      { path: "added", bytes: Buffer.from("n") },
    ];
    expect(
      diffResources(oldFiles, newFiles, "old", "new", "MIT", "Apache-2.0"),
    ).toMatchObject({
      added: ["added"],
      removed: ["removed"],
      changed: ["changed"],
      unchanged: ["same"],
      licenseChanged: true,
    });
  });
});
