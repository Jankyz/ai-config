# AI Config — Phase 6: Claude Adapter

**Status:** approved for implementation
**Approved:** 2026-09-06
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-5-PROJECT-BOOTSTRAP.md`  
**Phase:** 6 of 10  
**Provider:** Claude Code  
**Primary target:** macOS  
**Implementation authority:** no implementation before explicit owner approval  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Implement Claude Code as the second real `ai-config` provider using the canonical assets already created for Codex.

Phase 6 must provide equivalent semantics for:

- global agent instructions;
- eleven native workflow skills;
- explicit-only skill invocation;
- provider detection;
- provider-specific planning and verification;
- project-level bridging from canonical `AGENTS.md` to Claude.

Phase 6 must not duplicate canonical workflow content or create an independent Claude workflow.

---

## 2. Core invariant

The provider representation changes.

The workflow contract does not.

Conceptually:

```text
canonical ai-config
├── standards/global-agent-contract.md
├── skills/aic-*
└── project AGENTS.md
        │
        ├── Codex adapter
        │
        └── Claude adapter
```

Codex and Claude should consume the same semantic source wherever possible.

---

## 3. Current Claude Code contract

Phase 6 is based on the current documented Claude Code behavior.

### User instructions

```text
~/.claude/CLAUDE.md
```

### Project instructions

```text
./CLAUDE.md
```

or:

```text
./.claude/CLAUDE.md
```

### Personal skills

```text
~/.claude/skills/<skill-name>/SKILL.md
```

### Project skills

```text
.claude/skills/<skill-name>/SKILL.md
```

Claude loads user instructions before project instructions.

Project instructions closer to the working directory are loaded later and therefore provide more specific context.

---

## 4. AGENTS.md compatibility

Claude Code does not natively treat `AGENTS.md` as its project instruction file.

The documented interoperability pattern is:

```md
@AGENTS.md
```

inside project `CLAUDE.md`.

Phase 6 adopts this pattern.

Do not duplicate the contents of `AGENTS.md` into `CLAUDE.md`.

---

## 5. Claude config root

The default Claude Code user configuration root is:

```text
<homeDir>/.claude
```

Potential override:

```text
CLAUDE_CONFIG_DIR
```

The adapter must detect both.

However, Phase 6 does not assume custom `CLAUDE_CONFIG_DIR` provides complete instruction isolation.

---

## 6. Custom CLAUDE_CONFIG_DIR safety policy

Current Claude documentation describes `CLAUDE_CONFIG_DIR` as relocating user configuration, but current upstream
behavior has had unresolved/inconsistent handling of global `CLAUDE.md`.

Therefore Phase 6 uses this conservative policy:

```text
CLAUDE_CONFIG_DIR absent
→ full Phase 6 support

CLAUDE_CONFIG_DIR explicitly resolves to <homeDir>/.claude
→ full support

custom CLAUDE_CONFIG_DIR
→ detect and inspect
→ configuration apply NOT supported in Phase 6
```

Return a structured provider diagnostic equivalent to:

```text
CLAUDE_CUSTOM_CONFIG_DIR_UNVERIFIED
```

Do not silently write to both locations.

Do not claim isolation that Claude itself may not provide.

This restriction may be removed after upstream behavior is proven reliable.

---

## 7. Claude runtime context

Use injected runtime/environment inputs.

Conceptually:

```ts
interface ClaudeRuntimeContext {
  homeDir: string;
  env: Readonly<Record<string, string | undefined>>;
}
```

Tests must not depend on the real process HOME or real Claude configuration.

---

## 8. Claude paths

For the supported default profile:

```text
home           = <homeDir>/.claude
globalClaude   = <home>/.claude/CLAUDE.md
skillsRoot     = <home>/.claude/skills
settings       = <home>/.claude/settings.json
```

The exact internal naming may differ.

Paths must be resolved safely using existing Phase 2 filesystem guarantees.

---

## 9. Claude detection

Detect Claude Code using a direct fixed command such as:

```text
claude --version
```

Requirements:

- no shell;
- bounded timeout;
- injected/testable runner;
- preserve raw version evidence;
- distinguish missing binary from unexpected detection failure.

Phase 6 does not install Claude Code.

---

## 10. Global instructions ownership

The only global Claude instruction file managed by Phase 6 is:

```text
~/.claude/CLAUDE.md
```

Stable artifact identity:

```text
claude.global.instructions
```

Desired content is the canonical:

```text
standards/global-agent-contract.md
```

Do not maintain a Claude-specific copy of this contract.

Normal mode:

```text
0644
```

All ownership, drift, backup, transaction and rollback behavior comes from Phase 2.

---

## 11. Existing global CLAUDE.md

Use the standard Phase 2 ownership semantics:

```text
absent
→ CREATE

managed same content
→ NOOP

managed old desired content
→ REPLACE_MANAGED

managed local drift
→ conflict

existing unmanaged file
→ conflict

symlink / unsafe object
→ conflict
```

No implicit adoption.

Real existing user configuration migration remains Phase 9.

---

## 12. Claude settings remain external

Phase 6 does not manage:

```text
~/.claude/settings.json
~/.claude.json
```

or equivalent profile-specific settings.

Do not mutate:

- permissions;
- hooks;
- model settings;
- sandbox settings;
- plugins;
- MCP;
- authentication;
- telemetry;
- auto-memory settings.

The adapter may inspect relevant paths only when necessary for diagnostics.

---

## 13. Auto memory

Claude auto memory remains external to `ai-config`.

Phase 6 does not:

- enable it;
- disable it;
- inspect or rewrite its contents;
- claim that the canonical contract is the only context Claude receives.

Provider verification proves managed `ai-config` configuration convergence, not exclusive Claude context.

---

## 14. Canonical skill source

The canonical skill source remains:

```text
skills/aic-*/
```

Do not maintain separate Claude copies of the eleven native skills.

Claude representation is generated from the canonical skill at installation planning time.

---

## 15. Claude skill representation

Claude personal skills are installed under:

```text
~/.claude/skills/<skill-name>/
```

For each canonical native skill, install:

```text
<skill-name>/
├── SKILL.md
└── assets/...        # when canonical skill has runtime assets
```

Do not install Codex-only:

```text
agents/openai.yaml
```

into the Claude skill representation.

---

## 16. Claude SKILL.md adaptation

Canonical `SKILL.md` currently contains provider-neutral frontmatter such as:

```yaml
---
name: aic-plan
description: ...
---
```

The Claude adapter must render an adapted installed representation by adding:

```yaml
disable-model-invocation: true
```

to the existing frontmatter.

Example:

```yaml
---
name: aic-plan
description: ...
disable-model-invocation: true
---
```

The canonical source file itself remains unchanged.

Preserve:

- skill name;
- description;
- body;
- semantic workflow.

Do not rewrite prose for Claude.

---

## 17. Explicit invocation

All eleven core skills remain explicit-only.

Codex syntax:

```text
$aic-plan
```

Claude syntax:

```text
/aic-plan
```

The skill names themselves remain identical.

Do not create Claude aliases.

---

## 18. Invocation metadata

For Claude, explicit-only behavior is encoded in `SKILL.md` frontmatter:

```yaml
disable-model-invocation: true
```

Do not use Codex `agents/openai.yaml` for Claude.

Do not set:

```yaml
user-invocable: false
```

because the owner must retain manual invocation.

---

## 19. Coordinator-mode limitation

Current Claude Code has known mode-specific limitations around manual-only skills in coordinator-style execution.

Do not weaken:

```yaml
disable-model-invocation: true
```

to work around a provider-mode limitation.

Document the limitation as provider compatibility evidence.

Normal interactive Claude Code explicit invocation is the Phase 6 contract.

---

## 20. Bootstrap skill assets

`aic-bootstrap-project` must receive the same canonical project assets already used in the Codex representation:

```text
aic-bootstrap-project/
├── SKILL.md
└── assets/
    └── project/
        ├── AGENTS.md
        ├── CONTEXT.md
        ├── ARCHITECTURE.md
        ├── DESIGN.md
        └── docs/
            └── README.md
```

Bytes must come from canonical:

```text
templates/project/
```

No second template source.

---

## 21. Claude native skill catalog

Use the existing eleven-skill canonical catalog.

Do not create a Claude-specific list of workflow identities.

The Claude adapter only translates canonical skill assets into the Claude representation.

---

## 22. Claude skill planning

Use Phase 2 to plan managed skill files under:

```text
~/.claude/skills/
```

Expected semantics:

```text
missing
→ CREATE

managed unchanged
→ NOOP

managed desired update
→ REPLACE_MANAGED

managed local drift
→ conflict

unmanaged existing skill file
→ conflict
```

Do not implement recursive directory ownership or skill deletion.

---

## 23. Project CLAUDE.md bridge

Phase 6 introduces a minimal project compatibility bridge:

```text
CLAUDE.md
```

with canonical seed content:

```md
@AGENTS.md
```

This makes the Phase 5 root `AGENTS.md` available to Claude without duplicating project instructions.

---

## 24. Project bridge ownership

Project `CLAUDE.md` follows the Phase 5 **seed-only** model.

After creation it becomes repository-owned.

It is not recorded as a Phase 2 managed artifact.

Normal project edits may add Claude-specific instructions beneath:

```md
@AGENTS.md
```

without becoming installer drift.

---

## 25. Project bridge creation semantics

For a clearly resolved physical project root:

### `AGENTS.md`

Must exist as a safe regular file before a bridge is proposed.

### `CLAUDE.md` absent

```text
→ CREATE
```

seed content:

```md
@AGENTS.md
```

### Existing regular `CLAUDE.md`

```text
→ PRESERVE
```

Do not inject or merge `@AGENTS.md` automatically.

### Symlink or unsupported `CLAUDE.md`

```text
→ CONFLICT
```

### Missing/unsafe AGENTS.md

```text
→ SKIP / diagnostic
```

Do not invent project instructions.

---

## 26. .claude/CLAUDE.md and CLAUDE.local.md

Phase 6 does not create or manage:

```text
.claude/CLAUDE.md
CLAUDE.local.md
```

If they already exist, preserve them.

Provider verification must not claim the root bridge is Claude's only project instruction source.

---

## 27. Project bridge execution surface

Do not add another user-facing skill merely for Claude bridging.

Extend provider/bootstrap composition internally so Phase 9 migration/dogfooding can request the Claude bridge when
Claude support is selected.

`$aic-bootstrap-project` remains provider-neutral.

Do not put Claude-specific instructions into its canonical workflow body unless a minimal provider hook is genuinely
required.

---

## 28. Claude provider plan

Implement a concrete Claude provider composition combining:

```text
Claude detection
+
global CLAUDE.md plan
+
eleven Claude skill plans
+
provider diagnostics
```

The result should expose whether the complete Claude global environment is applicable/converged.

Do not build a large generic multi-provider orchestration framework.

---

## 29. Shared provider abstractions

Phase 6 is the first point where two real adapters exist.

Small shared abstractions may be extracted only when:

- Codex and Claude contain demonstrably duplicated semantics;
- extraction makes both implementations simpler;
- provider-specific differences remain explicit.

Do not introduce generic provider abstractions merely for symmetry.

Prefer duplication of a few clear lines over a complicated abstraction.

---

## 30. Verification

Claude global environment verification requires:

- Claude detected;
- supported default config root;
- global managed `CLAUDE.md` converged;
- all eleven native skill representations converged;
- all installed Claude skills contain `disable-model-invocation: true`;
- bootstrap assets match canonical templates;
- no installer conflicts remain.

PASS proves configuration convergence.

It does not prove:

- Claude obeyed every instruction;
- auto memory contains no conflicting context;
- project/local CLAUDE files contain no conflicts;
- coordinator mode supports manual-only skills.

---

## 31. Project bridge verification

For a project bridge operation, verify:

```text
AGENTS.md safe regular
+
CLAUDE.md exists as safe regular
+
when ai-config created it, exact initial bytes were @AGENTS.md
```

After repository ownership transfers, later content changes are not considered ai-config drift.

---

## 32. Package assets

Do not duplicate Claude-specific copies of canonical standards or skills in the npm package.

The package already includes:

```text
standards/
skills/
templates/project/
```

Claude representation should be rendered from those canonical assets.

Package only additional runtime adapter code required for Phase 6.

---

## 33. Tests — paths and detection

At minimum cover:

```text
default ~/.claude root
explicit CLAUDE_CONFIG_DIR == default root
custom CLAUDE_CONFIG_DIR blocker
relative CLAUDE_CONFIG_DIR rejection
unsafe/symlinked config root
Claude detected
Claude missing
Claude version failure
raw version evidence
```

Use isolated homes and injected runners.

---

## 34. Tests — global instructions

Cover:

```text
fresh CLAUDE.md create
managed NOOP
managed desired update
managed drift
unmanaged existing CLAUDE.md
symlink conflict
settings.json preserved
no real HOME mutation
```

---

## 35. Tests — skills

For all eleven skills verify:

- installed under `~/.claude/skills`;
- rendered `SKILL.md` has canonical name;
- canonical description retained;
- canonical body retained;
- `disable-model-invocation: true`;
- no `agents/openai.yaml` installed;
- bootstrap assets copied byte-for-byte;
- managed update converges;
- unmanaged/drifted skill content conflicts;
- repeated planning is NOOP.

---

## 36. Tests — project bridge

Cover:

```text
safe AGENTS + missing CLAUDE
→ CREATE @AGENTS.md

existing regular CLAUDE
→ PRESERVE unchanged

missing AGENTS
→ SKIP

symlinked AGENTS
→ no bridge

symlinked CLAUDE
→ CONFLICT

physical-root alias
→ bounded safe behavior
```

Do not test against a real project.

---

## 37. No real Claude mutation

Automated tests must not modify:

```text
real ~/.claude
real ~/.claude.json
real ~/.ai-config
real projects
```

Do not require Claude authentication or network access.

---

## 38. Provider documentation

Create:

```text
docs/providers/claude.md
```

Document concisely:

- provider identity;
- default config root;
- custom config-root limitation;
- global CLAUDE.md;
- skill root;
- explicit invocation representation;
- external settings/auto memory;
- project AGENTS bridge;
- current exclusions;
- upstream verification date and primary sources.

---

## 39. Existing documentation

Update:

```text
docs/architecture/core-workflow.md
```

only as necessary to describe provider-equivalent Codex/Claude representation.

Update Master Architecture only if a genuine durable contradiction is found.

Do not rewrite prior phase plans.

---

## 40. Production dependencies

Preferred result:

```text
None.
```

Use Node built-ins and existing repository helpers.

Do not add:

- YAML library solely for Claude frontmatter rendering;
- settings parser;
- process framework;
- template engine.

If safe frontmatter adaptation cannot be implemented using the existing canonical parser/validation code, report before
adding a production dependency.

---

## 41. Explicitly outside Phase 6

Do not implement:

- settings.json mutation;
- permissions;
- hooks;
- MCP;
- plugins;
- model configuration;
- auto-memory management;
- Claude installation;
- authentication;
- skill deletion;
- external skills;
- Matt/OMX/21st;
- public setup CLI;
- full real-workstation migration.

These belong to later phases or remain external.

---

## 42. Definition of Done

Phase 6 is complete when:

- concrete Claude adapter exists;
- Claude detection is shell-free and testable;
- default Claude config root is supported safely;
- custom CLAUDE_CONFIG_DIR is detected and conservatively blocked;
- canonical global contract installs as user CLAUDE.md;
- existing unmanaged global CLAUDE.md is preserved;
- all eleven native skills have a Claude representation;
- every Claude skill is explicit-only;
- canonical skill bodies are not duplicated or semantically rewritten;
- Codex metadata is not installed into Claude skills;
- bootstrap assets remain canonical and byte-identical;
- project CLAUDE.md bridge is seed-only;
- existing project CLAUDE.md is preserved;
- settings and auto memory remain external;
- Phase 1–5 regression tests remain green;
- no real Claude/project environment is modified;
- no unnecessary production dependency is introduced;
- manual QA passes;
- no material decision blocks Phase 7.

---

## 43. Approved decisions

Approval of this plan approves:

1. default Claude user root is `<homeDir>/.claude`;
2. custom `CLAUDE_CONFIG_DIR` is detection-only/blocking in Phase 6;
3. global canonical contract maps to user `CLAUDE.md`;
4. `settings.json` and `.claude.json` remain external;
5. auto memory remains external;
6. personal skills install under `~/.claude/skills`;
7. canonical SKILL.md is rendered with `disable-model-invocation: true`;
8. no Codex `agents/openai.yaml` is installed for Claude;
9. skill names remain `aic-*`;
10. Claude invocation syntax is `/aic-*`;
11. project compatibility uses seed-only `CLAUDE.md` containing `@AGENTS.md`;
12. existing project CLAUDE.md is never merged automatically;
13. no new user-facing Claude-specific workflow skill;
14. shared provider abstractions are extracted only from proven duplication.

---

## 44. Implementation sequence

1. Inspect Master Architecture, Phase 3–5 implementations and current provider contracts.
2. Reconfirm current Claude Code memory, skills, settings and invocation semantics from primary Anthropic documentation.
3. Implement Claude runtime paths and detection.
4. Implement global CLAUDE.md planning using Phase 2.
5. Implement Claude SKILL.md rendering and eleven-skill planning.
6. Preserve bootstrap project assets in the Claude representation.
7. Implement combined Claude global-environment verification.
8. Implement seed-only project CLAUDE.md bridge helper.
9. Add isolated unit/integration tests.
10. Add concise `docs/providers/claude.md`.
11. Update core-workflow documentation only where required.
12. Run full repository verification and package inspection.
13. Review for accidental canonical-content duplication and over-abstraction.
14. Produce completion report.
15. STOP — no commit and no Phase 7.

---

## 45. Completion report

Return:

### Status

`COMPLETE — awaiting manual verification`

or:

`BLOCKED — owner decision required`

### Upstream contract verification

List primary Claude Code sources used and reconfirm:

- user CLAUDE.md;
- project CLAUDE.md;
- AGENTS import;
- personal skills;
- explicit-only skill frontmatter;
- CLAUDE_CONFIG_DIR behavior/limitation.

### Files created / modified

Grouped concise list.

### Claude path model

Report:

```text
config root
global CLAUDE.md
skills root
settings path
```

### Detection

Explain detected/missing/error behavior.

### Global instructions

Explain canonical source and Phase 2 ownership.

### Skills

Report:

```text
count
installation root
frontmatter adaptation
invocation syntax
bootstrap assets
```

### Project bridge

Explain seed-only `@AGENTS.md` behavior.

### External Claude state

Confirm settings, auth/global state and auto memory remain unmanaged.

### Shared abstractions

List any cross-provider extraction and why it was justified.

If none:

`None.`

### Verification

Exact commands + PASS/FAIL and test counts.

### Scope/security review

Confirm:

- no real Claude mutation;
- no canonical-content duplication;
- no implicit skills;
- no settings mutation;
- no external skills;
- no commit.

### Known gaps

Include custom `CLAUDE_CONFIG_DIR` and any current coordinator-mode limitation where applicable.

### Deviations

If none:

`None.`

### Open decisions before Phase 7

If none:

`None.`

### Commit

End exactly:

`No commit created. Awaiting explicit owner instruction.`

---

## Phase invariant

> **Claude receives the same ai-config workflow through Claude-native representation, not through a second workflow
definition.**
