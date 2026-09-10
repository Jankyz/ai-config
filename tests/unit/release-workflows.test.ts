import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
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

const extractDraftReleaseStep = async () => {
  const workflow = await readWorkflow("release-draft.yml");
  const stepName = "      - name: Create a draft release when none exists\n";
  const stepStart = workflow.indexOf(stepName);
  expect(stepStart).toBeGreaterThanOrEqual(0);

  const nextStep = workflow.indexOf("\n      - ", stepStart + stepName.length);
  const step = workflow.slice(
    stepStart,
    nextStep === -1 ? undefined : nextStep,
  );
  const runMarker = "        run: |\n";
  const runStart = step.indexOf(runMarker);
  expect(runStart).toBeGreaterThanOrEqual(0);

  const script = step
    .slice(runStart + runMarker.length)
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");

  return { script, step };
};

const runDraftReleaseStep = async (releases: string) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-config-draft-release-"));
  const binDirectory = join(directory, "bin");
  const logPath = join(directory, "gh-calls.log");

  try {
    await mkdir(binDirectory);
    await writeFile(logPath, "");
    const fakeGh = join(binDirectory, "gh");
    await writeFile(
      fakeGh,
      [
        "#!/usr/bin/env bash",
        "set -eu",
        'if [ "${GH_TOKEN:-}" != "test-github-token" ]; then',
        '  echo "missing GH_TOKEN" >&2',
        "  exit 80",
        "fi",
        'case "$1 $2" in',
        '  "release list")',
        '    if [ "${FAKE_GH_RELEASES:-}" = "__LOOKUP_ERROR__" ]; then',
        "      exit 81",
        "    fi",
        '    printf "%s\n" "$FAKE_GH_RELEASES"',
        "    ;;",
        '  "release create")',
        '    printf "%s\n" "$*" >> "$FAKE_GH_LOG"',
        "    ;;",
        "  *)",
        '    echo "unexpected gh command: $*" >&2',
        "    exit 82",
        "    ;;",
        "esac",
      ].join("\n"),
    );
    await chmod(fakeGh, 0o755);

    const { script } = await extractDraftReleaseStep();
    const result = spawnSync("bash", ["-c", script], {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        FAKE_GH_LOG: logPath,
        FAKE_GH_RELEASES: releases,
        GH_TOKEN: "test-github-token",
        PATH: binDirectory + ":" + process.env.PATH,
        RELEASE_TAG: "v0.1.1",
      },
    });

    return {
      ghCalls: await readFile(logPath, "utf8"),
      result,
    };
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
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("group: release-draft-${{ github.ref_name }}");
    expect(workflow).toContain("cancel-in-progress: false");
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
    const { script, step } = await extractDraftReleaseStep();
    expect(workflow).toContain("contents: write");
    expect(workflow).not.toContain("id-token: write");
    expect(workflow).not.toMatch(/npm\s+(?:publish|stage)/);
    expect(workflow).not.toContain("/releases/tags/");
    expect(step).toContain("GH_TOKEN: ${{ github.token }}");
    expect(step).not.toContain("secrets.");
    expect(script).toContain(
      "gh release list --limit 1000 --json tagName,isDraft",
    );
    expect(script).toContain("set -euo pipefail");
    expect(script).not.toContain("gh api");
    expect(workflow).toContain("RELEASE_DRAFT_ALREADY_EXISTS ${RELEASE_TAG}");
    expect(workflow).toContain("RELEASE_ALREADY_PUBLISHED ${RELEASE_TAG}");
    expect(workflow).not.toContain("gh release edit");
    expect(workflow).not.toContain("--draft=false");
    expect(script.match(/gh release (?:list|create)/g)).toHaveLength(2);
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
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain(
      "group: publish-package-${{ github.event.release.tag_name }}",
    );
    expect(workflow).toContain("cancel-in-progress: false");
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

  it("uses non-cancelling concurrency groups scoped to the release tag", async () => {
    const [draft, publish] = await Promise.all([
      readWorkflow("release-draft.yml"),
      readWorkflow("publish.yml"),
    ]);

    expect(draft).toContain("group: release-draft-${{ github.ref_name }}");
    expect(publish).toContain(
      "group: publish-package-${{ github.event.release.tag_name }}",
    );
    expect(draft.match(/cancel-in-progress: false/g)).toHaveLength(1);
    expect(publish.match(/cancel-in-progress: false/g)).toHaveLength(1);
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

  describe("draft release state handling", () => {
    it("creates exactly one draft when the authenticated lookup finds no release", async () => {
      const { ghCalls, result } = await runDraftReleaseStep("[]");

      expect(result.status, result.stderr).toBe(0);
      expect(ghCalls.match(/^release create /gm)).toHaveLength(1);
      expect(ghCalls).toContain("--verify-tag");
      expect(ghCalls).toContain("--draft");
      expect(ghCalls).toContain("--generate-notes");
    });

    it("preserves an existing draft without creating another release", async () => {
      const { ghCalls, result } = await runDraftReleaseStep(
        '[{"tagName":"v0.1.1","isDraft":true}]',
      );

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("RELEASE_DRAFT_ALREADY_EXISTS v0.1.1");
      expect(ghCalls).toBe("");
    });

    it("preserves an existing published release without creating another release", async () => {
      const { ghCalls, result } = await runDraftReleaseStep(
        '[{"tagName":"v0.1.1","isDraft":false}]',
      );

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("RELEASE_ALREADY_PUBLISHED v0.1.1");
      expect(ghCalls).toBe("");
    });

    it("fails closed without creating a release when the lookup fails or is ambiguous", async () => {
      const lookupError = await runDraftReleaseStep("__LOOKUP_ERROR__");
      expect(lookupError.result.status).not.toBe(0);
      expect(lookupError.ghCalls).toBe("");

      const ambiguous = await runDraftReleaseStep(
        '[{"tagName":"v0.1.1","isDraft":true},{"tagName":"v0.1.1","isDraft":false}]',
      );
      expect(ambiguous.result.status).not.toBe(0);
      expect(ambiguous.ghCalls).toBe("");
    });
  });
});
