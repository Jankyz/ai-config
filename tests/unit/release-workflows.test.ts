import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const readWorkflow = (name: string) =>
  readFile(".github/workflows/" + name, "utf8");

const releaseWorkflows = ["release-draft.yml", "publish.yml"] as const;

const extractIdentityValidator = async (
  name: (typeof releaseWorkflows)[number],
) => {
  const workflow = await readWorkflow(name);
  const match = workflow.match(/node --input-type=module -e '([^']+)'/);

  expect(
    match,
    name + " must contain an executable identity validator",
  ).not.toBeNull();
  return match![1];
};

const runIdentityValidator = async (
  workflow: (typeof releaseWorkflows)[number],
  packageVersion: string,
  releaseTag: string,
) => {
  const directory = await mkdtemp(
    join(tmpdir(), "ai-config-release-validator-"),
  );

  try {
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ name: "@jankyz/ai-config", version: packageVersion }),
    );
    const validator = await extractIdentityValidator(workflow);
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", validator],
      {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_REPOSITORY: "Jankyz/ai-config",
          RELEASE_TAG: releaseTag,
        },
      },
    );

    return result;
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

describe("release workflow boundaries", () => {
  it("creates a draft only after verifying an existing pushed release tag", async () => {
    const workflow = await readWorkflow("release-draft.yml");
    expect(workflow).toContain('tags:\n      - "v[0-9]+.[0-9]+.[0-9]+"');
    expect(workflow).toContain("ref: ${{ github.ref }}");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain(
      'test "$(git rev-parse "$RELEASE_TAG^{commit}")" = "$(git rev-parse HEAD)"',
    );
    expect(workflow).toContain('pkg.name !== "@jankyz/ai-config"');
    expect(workflow).toContain("npm run check");
    expect(workflow).toContain("npm run pack:check");
    expect(workflow).toContain(
      'gh release create "$RELEASE_TAG" --verify-tag --draft --title "$RELEASE_TAG" --generate-notes --notes "$preamble"',
    );
  });

  it("preserves existing GitHub Releases and never obtains npm publication authority", async () => {
    const workflow = await readWorkflow("release-draft.yml");
    expect(workflow).toContain("contents: write");
    expect(workflow).not.toContain("id-token: write");
    expect(workflow).not.toMatch(/npm\s+(?:publish|stage)/);
    expect(workflow).toContain("RELEASE_DRAFT_ALREADY_EXISTS ${RELEASE_TAG}");
    expect(workflow).toContain("RELEASE_ALREADY_PUBLISHED ${RELEASE_TAG}");
    expect(workflow).not.toContain("gh release edit");
    expect(workflow).not.toContain("--draft=false");
  });

  it("publishes only after a manually published GitHub Release event", async () => {
    const workflow = await readWorkflow("publish.yml");
    expect(workflow).toContain("release:\n    types: [published]");
    expect(workflow).not.toContain("push:");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("id-token: write");
    expect(workflow).not.toContain("contents: write");
    expect(workflow).toContain(
      "RELEASE_TAG: ${{ github.event.release.tag_name }}",
    );
    expect(workflow).toContain("ref: ${{ github.event.release.tag_name }}");
    expect(workflow).toContain(
      'process.env.GITHUB_REPOSITORY !== "Jankyz/ai-config"',
    );
    expect(workflow).toContain('pkg.name !== "@jankyz/ai-config"');
    expect(workflow).toContain("npm-version-status.mjs");
  });

  it("keeps publishing OIDC-only and leaves ordinary CI read-only", async () => {
    const [publish, ci] = await Promise.all([
      readWorkflow("publish.yml"),
      readWorkflow("ci.yml"),
    ]);
    expect(publish).toContain("npm install --global npm@11.16.0");
    expect(publish).toContain("npm publish");
    expect(publish).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|npm\s+stage/i);
    expect(ci).toContain("actions/checkout@v7");
    expect(ci).toContain("actions/setup-node@v7");
    expect(ci).not.toMatch(
      /contents:\s*write|id-token:\s*write|npm\s+publish/i,
    );
  });

  describe("release identity validation", () => {
    it.each(["0.1.0", "0.1.1", "1.0.0", "10.20.30"])(
      "accepts valid semantic version %s in both release workflows",
      async (version) => {
        for (const workflow of releaseWorkflows) {
          const result = await runIdentityValidator(
            workflow,
            version,
            "v" + version,
          );
          expect(result.status, result.stderr).toBe(0);
        }
      },
    );

    it.each(["v0.1.1", "01.1.0", "0.01.0", "0.1"])(
      "rejects invalid semantic version %s in both release workflows",
      async (version) => {
        for (const workflow of releaseWorkflows) {
          const result = await runIdentityValidator(
            workflow,
            version,
            "v" + version,
          );
          expect(result.status).not.toBe(0);
          expect(result.stderr).toContain("invalid package version " + version);
        }
      },
    );

    it("accepts matching v0.1.1 release identities and rejects the prior package version", async () => {
      for (const workflow of releaseWorkflows) {
        const matching = await runIdentityValidator(
          workflow,
          "0.1.1",
          "v0.1.1",
        );
        expect(matching.status, matching.stderr).toBe(0);

        const mismatched = await runIdentityValidator(
          workflow,
          "0.1.0",
          "v0.1.1",
        );
        expect(mismatched.status).not.toBe(0);
        expect(mismatched.stderr).toContain("v0.1.0");
      }
    });
  });
});
