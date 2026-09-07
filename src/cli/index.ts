#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyProviderOperation,
  assertOperationApprovalFingerprint,
  operationCanApply,
  operationApprovalFingerprint,
  operationStatus,
  planProviderOperation,
  runtimeRoots,
  sourceHealth,
} from "../core/orchestration.js";
import type { ProviderId } from "../core/provider.js";
import {
  readRollbackReceipt,
  rollbackInstallTransaction,
} from "../installer/index.js";

const help = `ai-config — provider-neutral AI coding-agent environment configuration manager

Usage:
  ai-config setup --provider <codex|claude> [--replace-conflict <artifact-id>] [--apply]
  ai-config setup --provider <codex|claude> --replace-conflict <artifact-id> --approve-preview <fingerprint> --apply
  ai-config update --provider <codex|claude> [--apply]
  ai-config doctor [--provider <codex|claude>]
  ai-config rollback --provider <codex|claude> --transaction <uuid> [--apply]
  ai-config --help
  ai-config --version

setup, update, and rollback are previews unless --apply is supplied.`;

function packageVersion(): string {
  const packageUrl = new URL("../../package.json", import.meta.url);
  return (
    JSON.parse(readFileSync(fileURLToPath(packageUrl), "utf8")) as {
      version: string;
    }
  ).version;
}

interface Parsed {
  readonly command?: "setup" | "update" | "doctor" | "rollback";
  readonly provider?: ProviderId;
  readonly apply: boolean;
  readonly transaction?: string;
  readonly replaceConflictArtifactIds: readonly string[];
  readonly approvePreview?: string;
}

function fail(message: string): never {
  throw new Error(`${message}\n\n${help}`);
}

function parse(args: readonly string[]): Parsed {
  const [command, ...rest] = args;
  if (!command) return { apply: false, replaceConflictArtifactIds: [] };
  if (!["setup", "update", "doctor", "rollback"].includes(command))
    fail(`Unknown command: ${command}`);
  let provider: ProviderId | undefined;
  let apply = false;
  let transaction: string | undefined;
  let approvePreview: string | undefined;
  const replaceConflictArtifactIds: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--apply") {
      if (apply) fail("Duplicate --apply flag.");
      apply = true;
    } else if (argument === "--provider") {
      const value = rest[++index];
      if (value !== "codex" && value !== "claude")
        fail("--provider must be codex or claude.");
      if (provider) fail("Duplicate --provider flag.");
      provider = value;
    } else if (argument === "--transaction") {
      const value = rest[++index];
      if (!value || transaction)
        fail("--transaction requires exactly one value.");
      transaction = value;
    } else if (argument === "--replace-conflict") {
      const value = rest[++index];
      if (!value || value.startsWith("--"))
        fail("--replace-conflict requires an artifact ID.");
      if (replaceConflictArtifactIds.includes(value))
        fail("Duplicate --replace-conflict artifact ID.");
      replaceConflictArtifactIds.push(value);
    } else if (argument === "--approve-preview") {
      const value = rest[++index];
      if (!value || !/^[a-f0-9]{64}$/.test(value))
        fail("--approve-preview requires a lowercase SHA-256 fingerprint.");
      if (approvePreview) fail("Duplicate --approve-preview flag.");
      approvePreview = value;
    } else fail(`Unknown argument: ${argument}`);
  }
  if (command !== "doctor" && !provider)
    fail(`${command} requires --provider codex or --provider claude.`);
  if (command !== "rollback" && transaction)
    fail("--transaction is only valid for rollback.");
  if (command === "rollback" && !transaction)
    fail("rollback requires --transaction <uuid>.");
  if (command === "doctor" && (apply || transaction))
    fail("doctor is read-only and does not accept --apply or --transaction.");
  if (command !== "setup" && replaceConflictArtifactIds.length)
    fail("--replace-conflict is only valid for setup.");
  if (
    approvePreview &&
    (command !== "setup" || !apply || replaceConflictArtifactIds.length === 0)
  )
    fail(
      "--approve-preview requires setup, --apply, and at least one --replace-conflict.",
    );
  if (
    command === "setup" &&
    apply &&
    replaceConflictArtifactIds.length &&
    !approvePreview
  )
    fail(
      "Approved conflict replacement requires --approve-preview <fingerprint>.",
    );
  return {
    command: command as NonNullable<Parsed["command"]>,
    ...(provider === undefined ? {} : { provider }),
    apply,
    replaceConflictArtifactIds,
    ...(approvePreview === undefined ? {} : { approvePreview }),
    ...(transaction === undefined ? {} : { transaction }),
  };
}

function print(lines: readonly string[]) {
  for (const line of lines) console.log(line);
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--version", "-v"].includes(args[0]!))
    return void console.log(packageVersion());
  if (
    args.length === 0 ||
    (args.length === 1 && ["--help", "-h"].includes(args[0]!))
  )
    return void console.log(help);
  const parsed = parse(args);
  if (!parsed.command) return;
  const roots = runtimeRoots();
  if (parsed.command === "doctor") {
    console.log(`RUNTIME ${process.release.name ?? "node"} ${process.version}`);
    console.log(`PACKAGE ${packageVersion()}`);
    const sourceError = await sourceHealth();
    console.log(
      sourceError
        ? `BLOCKED registry/lock: ${sourceError}`
        : "NOOP registry/lock valid",
    );
    const providers: ProviderId[] = parsed.provider
      ? [parsed.provider]
      : ["codex", "claude"];
    let unhealthy = Boolean(sourceError);
    for (const provider of providers) {
      const operation = await planProviderOperation(provider, "setup", roots);
      print(operationStatus(operation).map((line) => `${provider}: ${line}`));
      unhealthy ||=
        !operationCanApply(operation) ||
        Boolean(operation.plan?.conflicts.length);
    }
    if (unhealthy) process.exitCode = 1;
    return;
  }
  if (parsed.command === "rollback") {
    const receipt = await readRollbackReceipt(
      roots.stateDir,
      parsed.transaction!,
    );
    print(
      receipt.actions.map(
        (action) => `ROLLBACK ${action.action} ${action.artifactId}`,
      ),
    );
    if (parsed.apply) {
      const allowedTargetRoots =
        parsed.provider === "codex"
          ? [
              dirname(receipt.actions[0]?.targetPath ?? roots.homeDir),
              `${roots.homeDir}/.agents`,
            ]
          : [`${roots.homeDir}/.claude`];
      const applied = await rollbackInstallTransaction(
        {
          homeDir: roots.homeDir,
          stateDir: roots.stateDir,
          allowedTargetRoots,
        },
        parsed.transaction!,
      );
      console.log(`ROLLED_BACK transaction ${applied.transactionId}`);
    }
    return;
  }
  const operation = await planProviderOperation(
    parsed.provider!,
    parsed.command,
    roots,
    { replaceConflictArtifactIds: parsed.replaceConflictArtifactIds },
  );
  print(operationStatus(operation));
  if (!operationCanApply(operation)) {
    process.exitCode = 1;
    return;
  }
  if (parsed.replaceConflictArtifactIds.length) {
    const fingerprint = operationApprovalFingerprint(operation, "setup");
    if (parsed.apply)
      assertOperationApprovalFingerprint(
        operation,
        "setup",
        parsed.approvePreview!,
      );
    else console.log(`APPROVAL_FINGERPRINT ${fingerprint}`);
  }
  if (parsed.apply && operation.plan?.hasChanges) {
    const receipt = await applyProviderOperation(operation, roots);
    console.log(
      `APPLIED transaction ${receipt?.transactionId ?? operation.plan.transactionId}`,
    );
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
