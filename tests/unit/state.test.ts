import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { parseState, parseReceipt } from "../../src/state/index.js";

const target = join(resolve(tmpdir()), "fixture", "alpha");
const entry = {
  id: "fixture.alpha",
  targetPath: target,
  ownership: "managed",
  contentHash: "a".repeat(64),
  mode: 0o640,
  lastTransactionId: "previous",
};
const state = (artifact: unknown) =>
  JSON.stringify({
    schemaVersion: 1,
    artifacts: { "fixture.alpha": artifact },
  });

it.each([
  ["relative target", { targetPath: "relative" }],
  ["unnormalized target", { targetPath: `${target}/../alpha` }],
  ["invalid SHA-256", { contentHash: "not-a-hash" }],
  ["uppercase SHA-256", { contentHash: "A".repeat(64) }],
  ["negative mode", { mode: -1 }],
  ["special mode bits", { mode: 0o4644 }],
  ["fractional mode", { mode: 1.5 }],
  ["string mode", { mode: "0644" }],
])("rejects unsafe state artifact schema: %s", (_name, patch) => {
  expect(() => parseState(state({ ...entry, ...patch }))).toThrow(
    expect.objectContaining({ kind: "STATE_INVALID" }),
  );
});

it("rejects duplicate normalized state targets and normalization aliases", () => {
  for (const path of [target, `${target}/../alpha`]) {
    const source = JSON.stringify({
      schemaVersion: 1,
      artifacts: {
        "fixture.alpha": entry,
        "fixture.beta": { ...entry, id: "fixture.beta", targetPath: path },
      },
    });
    expect(() => parseState(source)).toThrow();
  }
});

it("accepts valid managed and adopted records with optional modes", () => {
  expect(parseState(state(entry)).artifacts[entry.id]).toEqual(entry);
  const withoutMode = { ...entry, mode: undefined };
  expect(
    parseState(state({ ...withoutMode, ownership: "adopted" })).artifacts[
      entry.id
    ]?.ownership,
  ).toBe("adopted");
});

it.each(["null", "{}", JSON.stringify({ schemaVersion: 2, artifacts: {} })])(
  "rejects unsupported state structure: %s",
  (source) => {
    expect(() => parseState(source)).toThrow(
      expect.objectContaining({ kind: "STATE_INVALID" }),
    );
  },
);

it("rejects unsafe backup references and unsupported receipt schemas", () => {
  const id = "12345678-1234-4123-8123-123456789abc";
  const receipt = {
    schemaVersion: 1,
    transactionId: id,
    startedAt: "2026-09-06T00:00:00.000Z",
    completedAt: "2026-09-06T00:00:00.000Z",
    status: "committed",
    actions: [
      {
        artifactId: entry.id,
        targetPath: target,
        action: "REPLACE_MANAGED",
        afterHash: entry.contentHash,
        backupFile: "../escape",
      },
    ],
  };
  expect(() => parseReceipt(JSON.stringify(receipt), id)).toThrow(
    expect.objectContaining({ kind: "RECOVERY_REQUIRED" }),
  );
  expect(() =>
    parseReceipt(
      JSON.stringify({ ...receipt, schemaVersion: 2, actions: [] }),
      id,
    ),
  ).toThrow(expect.objectContaining({ kind: "RECOVERY_REQUIRED" }));
});
