import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const globalContractPath = fileURLToPath(
  new URL("../../standards/global-agent-contract.md", import.meta.url),
);

/** Reads the packaged canonical source for the Phase 3 global-instructions artifact. */
export async function readGlobalAgentContract(): Promise<string> {
  return readFile(globalContractPath, "utf8");
}
