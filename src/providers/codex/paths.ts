import { isAbsolute, join, parse, resolve } from "node:path";

export interface CodexRuntimeContext {
  readonly homeDir: string;
  readonly env: Readonly<Record<string, string | undefined>>;
}

export interface CodexPaths {
  readonly home: string;
  readonly globalAgents: string;
  readonly globalOverride: string;
  readonly configToml: string;
  readonly userSkillsRoot: string;
}

export class CodexPathError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CodexPathError";
  }
}

function absoluteNonRoot(path: string): boolean {
  return (
    isAbsolute(path) &&
    !path.includes("\0") &&
    resolve(path) !== parse(path).root
  );
}

/** Resolves only caller-supplied paths; filesystem safety is checked during inspection. */
export function resolveCodexPaths(context: CodexRuntimeContext): CodexPaths {
  const configured = context.env.CODEX_HOME?.trim();
  const home =
    configured === undefined || configured === ""
      ? join(context.homeDir, ".codex")
      : configured;
  if (!absoluteNonRoot(home))
    throw new CodexPathError(
      "CODEX_HOME must resolve to a non-root absolute path.",
    );
  const normalized = resolve(home);
  return {
    home: normalized,
    globalAgents: join(normalized, "AGENTS.md"),
    globalOverride: join(normalized, "AGENTS.override.md"),
    configToml: join(normalized, "config.toml"),
    userSkillsRoot: join(resolve(context.homeDir), ".agents", "skills"),
  };
}
