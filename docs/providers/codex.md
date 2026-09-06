# Codex provider adapter

## Identity and paths

The Codex adapter manages only global instructions. It resolves the Codex home from a non-empty,
absolute `CODEX_HOME`; otherwise it uses `<homeDir>/.codex`, where `homeDir` is supplied by the
calling runtime boundary. The resulting paths are:

```text
home                 = $CODEX_HOME
global instructions  = $CODEX_HOME/AGENTS.md
global override      = $CODEX_HOME/AGENTS.override.md
user configuration   = $CODEX_HOME/config.toml
```

Relative paths, filesystem root, symlinked homes, and other unsafe layouts are rejected. Path
resolution and provider inspection do not create directories.

## Ownership and precedence

`AGENTS.md` is the only Phase 3 managed artifact. Its stable installer ID is
`codex.global.instructions`, its bytes are supplied unchanged by the caller, and its normal mode is
`0644`. All ownership, drift, backup, rollback, and transaction behavior comes from the Phase 2
installer.

`AGENTS.override.md` is external and unmanaged. A missing override or a safe regular override with
only whitespace leaves `AGENTS.md` effective. A safe regular override with non-whitespace content
blocks planning and verification. Symlinks and unsupported override objects also block; the adapter
does not follow or modify them.

`config.toml` is external and read-only in this phase. The adapter can report its filesystem type,
but never parses, writes, chmods, adopts, or records ownership for it.

## Detection, planning, and verification

Detection directly executes the fixed `codex --version` argument vector with a bounded timeout; it
does not invoke a shell. Successful output is retained as raw evidence. A missing executable is
reported as `CODEX_NOT_DETECTED`; unexpected execution failure is reported as
`CODEX_DETECTION_ERROR`. Neither case plans a mutation.

`planCodexGlobalInstructions` combines detection, safe filesystem inspection, override status,
non-empty desired content, and one Phase 2 install plan. Provider diagnostics block before an
installer plan is created. Filesystem ownership conflicts stay in the Phase 2 installer plan.

Verification replans the same artifact. `VERIFIED` means Codex was detected, the home is safe, no
active or unsafe global override exists, the desired instructions are non-empty, and Phase 2 sees a
conflict-free `NOOP`. It does not establish that a model followed the instructions.

## Current exclusions

Phase 3 does not manage skills, plugins, project-level instruction files, Codex installation,
authentication, or `config.toml` merging.

## Upstream contract verification

Verified 2026-09-06 against official OpenAI documentation:

- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md):
  Codex defaults to `~/.codex` unless `CODEX_HOME` is set, and at global scope it reads
  `AGENTS.override.md` before `AGENTS.md`, using the first non-empty file.
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic): user-level configuration
  is stored at `~/.codex/config.toml`.
- [Codex configuration loader source](https://github.com/openai/codex/blob/main/codex-rs/config/src/loader/mod.rs):
  the user configuration layer is resolved as `${CODEX_HOME}/config.toml`, making custom
  `CODEX_HOME` behavior explicit.
