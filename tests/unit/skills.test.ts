import { describe, expect, it } from "vitest";

import {
  nativeSkillNames,
  validateNativeSkillCatalog,
} from "../../src/skills/index.js";

describe("native skill catalog", () => {
  it("contains exactly the approved explicit-only Phase 4 skills", async () => {
    expect(nativeSkillNames).toEqual([
      "aic-research",
      "aic-clarify",
      "aic-analyze",
      "aic-plan",
      "aic-implement",
      "aic-diagnose",
      "aic-review",
      "aic-verify",
      "aic-security-review",
      "aic-lore-commit",
    ]);
    const catalog = await validateNativeSkillCatalog();
    expect(catalog).toMatchObject({ valid: true, errors: [] });
    expect(catalog.skills).toHaveLength(10);
    for (const skill of catalog.skills) {
      expect(skill.skillMarkdown).toContain(`name: ${skill.name}`);
      expect(skill.codexMetadata).toContain("allow_implicit_invocation: false");
      expect(skill.codexMetadata).toContain(`$${skill.name}`);
    }
  });
});
