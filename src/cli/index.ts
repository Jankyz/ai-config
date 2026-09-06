#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const help = `ai-config — provider-neutral AI coding-agent environment configuration manager

Usage:
  ai-config --help
  ai-config --version

This pre-release foundation does not yet provide configuration commands.`;

function packageVersion(): string {
  const packageUrl = new URL("../../package.json", import.meta.url);
  const packageJson = JSON.parse(
    readFileSync(fileURLToPath(packageUrl), "utf8"),
  ) as {
    version: string;
  };
  return packageJson.version;
}

const [argument] = process.argv.slice(2);

if (argument === "--version" || argument === "-v") {
  console.log(packageVersion());
} else if (
  argument === "--help" ||
  argument === "-h" ||
  argument === undefined
) {
  console.log(help);
} else {
  console.error(`Unknown command: ${argument}\n\n${help}`);
  process.exitCode = 1;
}
