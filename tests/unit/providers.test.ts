import { describe, expect, it } from "vitest";

import { providers } from "../../src/providers/index.js";

describe("provider registry", () => {
  it("declares the approved initial provider identities", () => {
    expect(providers).toEqual([
      { id: "codex", displayName: "OpenAI Codex" },
      { id: "claude", displayName: "Claude Code" },
    ]);
  });
});
