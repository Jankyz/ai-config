import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const readWorkflow = (name: string) =>
  readFile(`.github/workflows/${name}`, "utf8");

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
});
