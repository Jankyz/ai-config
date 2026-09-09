import { describe, expect, it } from "vitest";

import {
  nativeSkillNames,
  validateNativeSkillCatalog,
} from "../../src/skills/index.js";

describe("native skill catalog", () => {
  it("contains exactly the approved explicit-only canonical skills", async () => {
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
      "aic-bootstrap-project",
      "aic-ui-components",
      "aic-ui-generate",
      "aic-ui-review",
      "aic-product-design-lead",
      "aic-tdd",
      "aic-domain-modeling",
      "aic-shadcn",
    ]);
    const catalog = await validateNativeSkillCatalog();
    expect(catalog).toMatchObject({ valid: true, errors: [] });
    expect(catalog.skills).toHaveLength(18);
    for (const skill of catalog.skills) {
      expect(skill.skillMarkdown).toContain(`name: ${skill.name}`);
      expect(skill.codexMetadata).toContain("allow_implicit_invocation: false");
      expect(skill.codexMetadata).toContain(`$${skill.name}`);
    }
  });

  it("keeps UI extensions bounded, explicit-only, and free of upstream setup actions", async () => {
    const catalog = await validateNativeSkillCatalog();
    const uiSkills = catalog.skills.filter((skill) =>
      skill.name.startsWith("aic-ui-"),
    );
    expect(uiSkills.map((skill) => skill.name)).toEqual([
      "aic-ui-components",
      "aic-ui-generate",
      "aic-ui-review",
    ]);
    for (const skill of uiSkills) {
      expect(skill.skillMarkdown).not.toMatch(
        /disable-model-invocation|allow_implicit_invocation/,
      );
      expect(skill.skillMarkdown).not.toMatch(
        /^\s*(?:\d+\.\s*)?(?:21st\s+)?(?:install-skill|skills add|init --write|publish(?:-theme)?)\b/im,
      );
      expect(skill.skillMarkdown).not.toMatch(
        /^\s*(?:\d+\.\s*)?(?:git\s+)?commit\b/im,
      );
    }
    const components = uiSkills.find(
      (skill) => skill.name === "aic-ui-components",
    )!;
    const generate = uiSkills.find(
      (skill) => skill.name === "aic-ui-generate",
    )!;
    const review = uiSkills.find((skill) => skill.name === "aic-ui-review")!;
    expect(components.skillMarkdown).toMatch(/discovery[\s\S]*read-only/i);
    expect(components.skillMarkdown).toMatch(/approved implementation/i);
    for (const command of ["21st search", "21st get", "21st theme", "21st add"])
      expect(components.skillMarkdown).toContain(command);
    expect(components.skillMarkdown).toContain("--type component");
    expect(components.skillMarkdown).not.toMatch(/--type c(?:\s|$)/);
    expect(components.skillMarkdown).toContain(
      "BLOCKED — 21st paid operation requires owner authorization",
    );
    expect(components.skillMarkdown).toContain("21st add <component> --print");
    expect(generate.skillMarkdown).toMatch(/exploration/i);
    expect(generate.skillMarkdown).toMatch(/approved implementation/i);
    for (const command of [
      "21st generate",
      "21st generation",
      "21st iterate",
      "21st take",
    ])
      expect(generate.skillMarkdown).toContain(command);
    expect(generate.skillMarkdown).toContain(
      "BLOCKED — 21st paid operation requires owner authorization",
    );
    for (const skill of [components, generate]) {
      expect(skill.skillMarkdown).toContain(
        "Do not invoke `npx`, `bunx`, `npm exec`",
      );
      expect(skill.skillMarkdown).not.toMatch(
        /^\s*(?:npx|bunx|npm exec)\s+.*21st/im,
      );
      expect(skill.skillMarkdown).not.toMatch(
        /^\s*21st\s+(?:login|logout|init|install-skill|publish(?:-theme|-template)?|edit|delete)\b/im,
      );
    }
    expect(components.skillMarkdown).toMatch(
      /skills\/21st-cli-use`, commit `?0d77001a77fe8540bb07ed68d09092ee08546ed3/,
    );
    expect(generate.skillMarkdown).toMatch(
      /skills\/21st-ai`, commit `?0d77001a77fe8540bb07ed68d09092ee08546ed3/,
    );
    expect(review.skillMarkdown).toContain(
      "BLOCKED — visual evidence unavailable",
    );
    expect(review.skillMarkdown).toMatch(
      /score: 0-100[\s\S]*verdict: PASS \| REVISE \| FAIL/i,
    );
    expect(review.skillMarkdown).toMatch(/read-only/i);
    expect(review.skillMarkdown).not.toMatch(/21st-dev\/skill|Apache-2\.0/);
  });
});
