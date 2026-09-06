import { isAbsolute, join, parse, resolve } from "node:path";

export interface ClaudeRuntimeContext {
  readonly homeDir: string;
  readonly env: Readonly<Record<string, string | undefined>>;
}

export interface ClaudePaths {
  readonly home: string;
  readonly globalClaude: string;
  readonly userSkillsRoot: string;
  readonly settingsJson: string;
  readonly usesCustomConfigDir: boolean;
}

export class ClaudePathError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ClaudePathError";
  }
}

function absoluteNonRoot(path: string): boolean {
  return (
    isAbsolute(path) &&
    !path.includes("\0") &&
    resolve(path) !== parse(path).root
  );
}

/** Resolves caller-supplied paths only; inspection checks filesystem safety separately. */
export function resolveClaudePaths(context: ClaudeRuntimeContext): ClaudePaths {
  const defaultHome = join(context.homeDir, ".claude");
  const configured = context.env.CLAUDE_CONFIG_DIR;
  const home =
    configured === undefined || configured === "" ? defaultHome : configured;
  if (!absoluteNonRoot(home))
    throw new ClaudePathError(
      "CLAUDE_CONFIG_DIR must resolve to a non-root absolute path.",
    );
  const normalized = resolve(home);
  return {
    home: normalized,
    globalClaude: join(normalized, "CLAUDE.md"),
    userSkillsRoot: join(normalized, "skills"),
    settingsJson: join(normalized, "settings.json"),
    usesCustomConfigDir:
      configured !== undefined &&
      configured !== "" &&
      normalized !== resolve(defaultHome),
  };
}
