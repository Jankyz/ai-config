# Claude Code provider adapter

## Identity and paths

The Claude adapter supports the default user configuration root supplied by the runtime:

```text
config root          = <homeDir>/.claude
global instructions  = <homeDir>/.claude/CLAUDE.md
personal skills      = <homeDir>/.claude/skills/<skill-name>/SKILL.md
user settings        = <homeDir>/.claude/settings.json
```

`CLAUDE_CONFIG_DIR` is read literally from the injected environment. Only an absent or empty value
uses the default root; whitespace-only and otherwise non-absolute values are rejected rather than
normalized. Phase 6 supports an explicit value only when it resolves exactly to the default root. A
distinct absolute root produces the
`CLAUDE_CUSTOM_CONFIG_DIR_UNVERIFIED` blocker; a relative or root path is rejected. This avoids
claiming safe isolation for a custom root before upstream behavior for all instruction sources is
proven.

## Ownership and exclusions

`CLAUDE.md` is the managed Phase 2 artifact `claude.global.instructions`. Its bytes come unchanged
from `standards/global-agent-contract.md`, with standard Phase 2 ownership, drift, backup,
transaction, and rollback behavior. Existing unmanaged or unsafe `CLAUDE.md` files conflict.

Settings, `~/.claude.json`, credentials, auto memory, hooks, MCP, plugins, permissions, model
configuration, and telemetry remain external. The adapter neither parses nor modifies them.

## Skills

All canonical `aic-*` skills are rendered directly from `skills/aic-*/SKILL.md` under the
personal skills root. The installed representation adds only
`disable-model-invocation: true` to frontmatter, retaining the canonical name, description, and
body. Claude invocation remains `/aic-*`. Codex-only `agents/openai.yaml` is never installed.

`aic-bootstrap-project` receives its `assets/project/` files from `templates/project/`; the
installer copies those bytes unchanged.

The Phase 8 UI extensions `aic-ui-components`, `aic-ui-generate`, and `aic-ui-review` use the same translation and remain explicitly invoked as `/aic-ui-*`. The first two require an already available 21st CLI for their external capability; installation and authentication remain outside ai-config. Visual review requires current and approved reference screenshots and is read-only.

## Project bridge

For a safe physical project root with a regular `AGENTS.md`, the bridge helper can create the
repository-owned seed `CLAUDE.md` whose exact initial bytes are `@AGENTS.md\n`. Existing regular
`CLAUDE.md` files are preserved and never merged; unsafe files conflict. `.claude/CLAUDE.md` and
`CLAUDE.local.md` remain external.

## Upstream contract verification

Verified 2026-09-06 against Anthropic primary documentation:

- [How Claude remembers your project](https://code.claude.com/docs/en/memory): user instructions
  use `~/.claude/CLAUDE.md`; project instructions may use `./CLAUDE.md` or
  `./.claude/CLAUDE.md`; `@AGENTS.md` is the documented interoperability bridge. The same source
  confirms auto memory is distinct context and remains external to this adapter.
- [Extend Claude with skills](https://code.claude.com/docs/en/skills): personal skills live under
  `~/.claude/skills/<skill-name>/SKILL.md`; `disable-model-invocation: true` keeps a skill manually
  invocable with `/name` while preventing automatic model invocation. It also documents the
  coordinator/subagent limitation: such skills cannot be preloaded into subagents.
- [Claude Code settings](https://code.claude.com/docs/en/settings): user settings live under
  `~/.claude/settings.json`; `CLAUDE_CONFIG_DIR` relocates settings, session history, and plugins.
  Phase 6 conservatively blocks distinct custom roots rather than assuming that statement proves
  global-instruction isolation.
