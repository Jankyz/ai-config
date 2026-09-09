import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { externalSkillAssets } from "../../src/skills/index.js";
import {
  extractNpmPackageTarball,
  verifyNpmSri,
} from "../../src/tools/index.js";
import { phase91DependencyClient } from "../fixtures/phase91-dependency-client.js";

function tar(files: readonly { path: string; content: string }[]): Uint8Array {
  const blocks: Buffer[] = [];
  for (const file of files) {
    const header = Buffer.alloc(512);
    header.write(`package/${file.path}`);
    header.write(file.content.length.toString(8).padStart(11, "0"), 124);
    header[156] = "0".charCodeAt(0);
    const content = Buffer.from(file.content);
    blocks.push(
      header,
      content,
      Buffer.alloc((512 - (content.length % 512)) % 512),
    );
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}

describe("Phase 9.1 dependencies", () => {
  it("materializes verified external skills with provider-specific UI UX entry points", async () => {
    const client = await phase91DependencyClient();
    const [codex, claude] = await Promise.all([
      externalSkillAssets("codex", client),
      externalSkillAssets("claude", client),
    ]);
    expect(codex.map((skill) => skill.name)).toEqual([
      "codebase-design",
      "writing-for-agents",
      "ui-ux-pro-max",
    ]);
    const codexUiUx = codex.find((skill) => skill.name === "ui-ux-pro-max")!;
    const claudeUiUx = claude.find((skill) => skill.name === "ui-ux-pro-max")!;
    expect(
      Buffer.from(
        codexUiUx.files.find((file) => file.path === "SKILL.md")!.content,
      ).toString(),
    ).toContain("~/.agents/skills/ui-ux-pro-max/scripts/search.py");
    expect(
      Buffer.from(
        claudeUiUx.files.find((file) => file.path === "SKILL.md")!.content,
      ).toString(),
    ).toContain("~/.claude/skills/ui-ux-pro-max/scripts/search.py");
    expect(
      codexUiUx.files.some((file) => file.path === "scripts/search.py"),
    ).toBe(true);
    expect(
      codexUiUx.files.some((file) => file.path === "data/ux-guidelines.csv"),
    ).toBe(true);
  });

  it("rejects unsafe npm archive paths before they can become tool files", () => {
    const archive = tar([{ path: "../escape", content: "bad" }]);
    expect(() => extractNpmPackageTarball(archive)).toThrow(
      /unsafe package path/i,
    );
  });

  it("fails closed when npm bytes do not match the expected SRI", () => {
    expect(() =>
      verifyNpmSri(new TextEncoder().encode("different"), "sha512-AAAA"),
    ).toThrow(/integrity/i);
  });
});
