import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  exactPackageVersionStatus,
  packageStatusMessage,
} from "../../scripts/npm-version-status.mjs";

describe("npm publish target status", () => {
  it("marks a missing exact version as publishable", async () => {
    await expect(
      exactPackageVersionStatus(
        "ai-config",
        "0.1.0",
        async () => new Response(null, { status: 404 }),
      ),
    ).resolves.toBe("missing");
    expect(packageStatusMessage("ai-config", "0.1.0", "missing")).toBe(
      "PACKAGE_NOT_PUBLISHED ai-config@0.1.0",
    );
  });

  it("marks an existing exact version as already published", async () => {
    await expect(
      exactPackageVersionStatus(
        "ai-config",
        "0.1.0",
        async () => new Response(null, { status: 200 }),
      ),
    ).resolves.toBe("published");
    expect(packageStatusMessage("ai-config", "0.1.0", "published")).toBe(
      "PACKAGE_ALREADY_PUBLISHED ai-config@0.1.0",
    );
  });

  it("rejects unexpected registry failures instead of treating them as published", async () => {
    await expect(
      exactPackageVersionStatus(
        "ai-config",
        "0.1.0",
        async () => new Response(null, { status: 503 }),
      ),
    ).rejects.toThrow("REGISTRY_CHECK_FAILED ai-config@0.1.0: HTTP 503");
  });

  it("uses the status result to gate publish in the workflow", async () => {
    const workflow = await readFile(".github/workflows/publish.yml", "utf8");
    expect(workflow).toContain("npm-version-status.mjs");
    expect(workflow).toContain('0) echo "publish=true" >> "$GITHUB_OUTPUT" ;;');
    expect(workflow).toContain(
      '10) echo "publish=false" >> "$GITHUB_OUTPUT" ;;',
    );
    expect(workflow).toContain("if: steps.registry.outputs.publish == 'true'");
  });
});
