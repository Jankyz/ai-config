# AI Config — Phase 3: Codex Adapter Implementation Plan

**Status:** approved for implementation
**Approved:** 2026-09-06
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-2-INSTALLER-CORE.md`  
**Phase:** 3 of 10  
**Provider:** OpenAI Codex  
**Primary target:** macOS  
**Runtime baseline:** Node.js 24  
**Implementation authority:** no implementation before explicit owner approval  
**Commit authority:** no commits without explicit owner instruction

---

# 1. Goal

Implement the first real provider adapter for `ai-config`:

> **Codex Adapter**

Phase 3 connects the provider-neutral installer core created in Phase 2 with the current Codex global-instructions
contract.

The adapter must be able to:

- detect whether Codex is available;
- resolve the effective Codex home;
- describe Codex-owned and user-owned paths;
- inspect global Codex instruction state;
- detect global instruction overrides;
- translate canonical global instruction content into a provider-specific desired artifact;
- generate a safe Phase 2 install plan;
- apply that plan only to isolated/test Codex environments during Phase 3;
- verify that the intended global `AGENTS.md` is correctly managed;
- preserve all Codex configuration not explicitly owned by `ai-config`.

Phase 3 must establish a trustworthy provider boundary without yet implementing the actual final global rules.

---

# 2. Governing architecture

All implementation must comply with:

```text
docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md
docs/architecture/installer-core.md
docs/plans/PHASE-2-INSTALLER-CORE.md
docs/plans/PHASE-3-CODEX-ADAPTER.md
```

The Master Architecture defines durable project-wide decisions.

The installer-core architecture defines the filesystem mutation guarantees.

This Phase 3 plan defines the Codex-specific adapter contract.

If implementation evidence reveals a material conflict:

1. stop the affected branch;
2. establish facts;
3. document the conflict;
4. present alternatives;
5. provide a recommendation;
6. obtain owner approval;
7. update durable architecture if required;
8. only then continue.

---

# 3. Previous-phase baseline

Phase 2 provides the provider-neutral regular-file installer core.

It already supports:

- explicit installer contexts;
- allowed target roots;
- safe path validation;
- symlink protection;
- SHA-256 content tracking;
- managed/adopted/unmanaged ownership semantics;
- deterministic install planning;
- dry-run semantics;
- stale-plan protection;
- transaction locking;
- backups;
- receipts;
- state schema v1;
- atomic per-file publication;
- same-process rollback;
- recovery blocking on uncertainty.

Phase 3 must **reuse** these mechanisms.

Do not duplicate provider-neutral filesystem logic inside the Codex adapter.

---

# 4. Core Phase 3 invariant

The Codex adapter answers:

> **What Codex configuration should exist, where should it exist, and is it actually effective?**

The installer core answers:

> **Can this file safely be created or updated?**

Do not collapse these responsibilities.

---

# 5. Current Codex global instruction contract

Phase 3 is based on the current documented Codex instruction behavior:

```text
$CODEX_HOME/
├── AGENTS.override.md
└── AGENTS.md
```

Global discovery semantics:

```text
non-empty AGENTS.override.md
        ↓
used as global instructions

otherwise

AGENTS.md
        ↓
used as global instructions
```

Only the first active global instruction source is used at this level.

Project-specific instruction discovery remains separate and is not implemented by Phase 3.

---

# 6. Codex home

Codex home defaults conceptually to:

```text
~/.codex
```

and may be overridden using:

```text
CODEX_HOME
```

The adapter must support both.

Do not hardcode:

```text
/Users/<username>/.codex
```

or any other personal path.

---

# 7. Codex home resolution

Codex home resolution should follow:

```text
non-empty CODEX_HOME provided
        ↓
use explicit CODEX_HOME

otherwise

<user-home>/.codex
```

The resolver must operate from an injected environment/input rather than directly relying on the developer's process
environment in tests.

---

# 8. Explicit environment boundary

Introduce a small Codex-specific runtime context.

Conceptually:

```ts
interface CodexRuntimeContext {
  homeDir: string;
  env: Readonly<Record<string, string | undefined>>;
}
```

The exact shape may differ.

The important requirements are:

- tests can inject HOME-equivalent paths;
- tests can inject `CODEX_HOME`;
- adapter logic does not secretly use the developer's real environment;
- production resolution happens at an orchestration boundary.

---

# 9. CODEX_HOME validation

The resolved Codex home must be:

- explicit;
- absolute;
- non-root;
- normalized;
- filesystem-safe under the Phase 2 path model.

A relative `CODEX_HOME` must not be silently resolved against `process.cwd()`.

If an unsupported/unsafe Codex home is supplied:

```text
INVALID_CODEX_HOME
```

or equivalent structured provider error.

---

# 10. Codex provider path model

Phase 3 should expose a provider-specific path model.

Conceptually:

```ts
interface CodexPaths {
  home: string;
  globalAgents: string;
  globalOverride: string;
  configToml: string;
}
```

Resolving these paths must not mutate the filesystem.

---

# 11. Path semantics

For a resolved Codex home:

```text
home           = $CODEX_HOME
globalAgents   = $CODEX_HOME/AGENTS.md
globalOverride = $CODEX_HOME/AGENTS.override.md
configToml     = $CODEX_HOME/config.toml
```

No skills path belongs in the Phase 3 adapter contract.

---

# 12. Skills explicitly excluded

Phase 3 must not manage Codex skills.

Current Codex skill discovery is handled through the current Codex skill mechanism, including user and repository
`.agents/skills` locations.

That belongs to:

```text
Phase 4 — Core Standards + Skills
```

and later external-source work.

Do not create:

```text
$CODEX_HOME/skills
.codex/skills
.agents/skills
```

as part of Phase 3 implementation.

---

# 13. Plugins explicitly excluded

Codex Plugins are outside Phase 3.

Do not:

- install plugins;
- create plugin manifests;
- package skills as plugins;
- manage plugin registries;
- install MCP through plugins.

Plugin distribution strategy belongs to later phases.

---

# 14. config.toml ownership

Phase 3 must recognize:

```text
$CODEX_HOME/config.toml
```

as a current Codex user configuration file.

However:

> **`ai-config` does not own or mutate `config.toml` in Phase 3.**

This is a hard boundary.

---

# 15. Why config.toml is not managed yet

`config.toml` may contain unrelated user configuration such as:

- models;
- profiles;
- approval settings;
- sandbox settings;
- project-document fallback names;
- MCP;
- hooks;
- skill enablement;
- other current or future Codex settings.

Phase 2 currently implements safe whole-file managed ownership.

It does not yet implement Codex-specific adopted TOML merging.

Therefore Phase 3 must not take full ownership of `config.toml`.

---

# 16. config.toml inspection

The adapter may inspect whether `config.toml` is:

```text
absent
regular file
symbolic link
other filesystem object
```

It may report this in provider diagnostics.

It must not:

- parse and rewrite it;
- normalize it;
- replace it;
- delete it;
- adopt it;
- change permissions.

---

# 17. AGENTS.md ownership decision

The primary Phase 3 managed artifact is:

```text
$CODEX_HOME/AGENTS.md
```

It is a full-file managed artifact.

Stable installer artifact ID:

```text
codex.global.instructions
```

unless implementation evidence demonstrates a stronger naming reason.

---

# 18. AGENTS.override.md ownership decision

`ai-config` does **not** manage:

```text
$CODEX_HOME/AGENTS.override.md
```

in Phase 3.

It must never:

- delete it;
- rename it;
- overwrite it;
- adopt it;
- replace its contents.

It is an external override mechanism.

---

# 19. Why override remains external

The Codex override file exists specifically to supersede normal global guidance.

Using it as the main `ai-config` artifact would remove a useful manual emergency/temporary override mechanism.

Therefore:

```text
AGENTS.md
→ canonical ai-config managed global Codex guidance

AGENTS.override.md
→ external/manual override
```

---

# 20. Active override semantics

The adapter must determine whether an existing override prevents managed `AGENTS.md` from being the effective global
instruction source.

Conceptually:

```text
override absent
→ not active

override regular + empty/whitespace-only
→ not active

override regular + non-whitespace content
→ active

override symlink/unsafe filesystem state
→ cannot safely establish effective guidance
```

Do not follow unsafe override symlinks merely to discover their content.

---

# 21. Active override behavior

If an active global override exists:

```text
CODEX_GLOBAL_OVERRIDE_ACTIVE
```

or equivalent provider-specific diagnostic must be produced.

Default behavior:

```text
canApply = false
```

for a Codex global-instructions operation.

Reason:

Installing/updating `AGENTS.md` while an active override shadows it would produce a technically successful filesystem
mutation but an ineffective Codex configuration.

The adapter must fail visibly rather than report false success.

---

# 22. Unsafe override behavior

If `AGENTS.override.md` exists in an unsafe form such as a symbolic link or unsupported filesystem object:

```text
CODEX_GLOBAL_OVERRIDE_UNSAFE
```

and the provider plan must not apply.

Preservation takes priority.

---

# 23. Empty override behavior

A safe regular override containing only whitespace does not block managed `AGENTS.md`.

The adapter may report:

```text
overridePresent: true
overrideActive: false
```

for diagnostics.

It must not modify the file.

---

# 24. Existing AGENTS.md

Existing `$CODEX_HOME/AGENTS.md` is passed through the Phase 2 ownership model.

Possible outcomes include:

```text
absent
→ CREATE

known managed unchanged
→ NOOP

known managed with new desired content
→ REPLACE_MANAGED

managed drift
→ conflict

existing unmanaged file
→ conflict

symlink
→ conflict
```

Do not implement provider-specific overwrite exceptions.

---

# 25. Existing unmanaged AGENTS.md

If a pre-existing global `AGENTS.md` was not created/adopted by `ai-config`:

```text
UNMANAGED_EXISTS
```

must remain the default installer behavior.

The Codex adapter must not silently claim ownership because:

- filename matches;
- contents look similar;
- contents exactly equal the desired content.

Ownership requires installer state evidence.

---

# 26. Initial migration intentionally deferred

The real workstation already has an existing Codex configuration.

Phase 3 does not migrate it.

Actual migration/adoption of the user's current global Codex environment belongs to:

```text
Phase 9 — Migration and Dogfooding
```

Do not introduce one-off migration logic during Phase 3.

---

# 27. Final global instruction content intentionally deferred

Phase 3 does not define the production contents of global `AGENTS.md`.

The actual compact global working contract is designed in:

```text
Phase 4 — Core Standards + Skills
```

Phase 3 only implements the translation mechanism:

```text
canonical global instruction content
        ↓
Codex desired artifact
        ↓
$CODEX_HOME/AGENTS.md
```

---

# 28. Test global instruction content

Tests should use neutral fixture content such as:

```text
# Test global instructions

Follow the test contract.
```

Do not copy the current real OMX-heavy global `AGENTS.md` into Phase 3 fixtures.

---

# 29. Empty canonical instructions

Blank or whitespace-only canonical global instructions should be rejected.

Recommended provider diagnostic:

```text
EMPTY_GLOBAL_INSTRUCTIONS
```

Reason:

Codex ignores empty global instruction files and therefore they cannot satisfy verification.

---

# 30. Content transformation

The adapter should avoid unnecessary rewriting of canonical content.

Do not:

- reorder sections;
- rewrite prose;
- inject Codex-specific policy into the body;
- normalize semantics;
- add hidden headers.

If a final newline policy is adopted, it must be deterministic and documented.

Prefer preserving supplied content exactly unless a concrete provider requirement requires transformation.

---

# 31. Codex detection

Phase 3 should detect whether the Codex executable is available.

Detection must be:

- provider-specific;
- read-only;
- testable;
- shell-free.

Do not use:

```text
exec("codex ...")
```

through a shell.

Use a direct process execution primitive such as `execFile`/`spawn` with arguments.

---

# 32. Detection result

Conceptually:

```ts
interface CodexDetection {
  installed: boolean;
  executable?: string;
  versionOutput?: string;
  paths: CodexPaths;
}
```

The exact shape may differ.

Do not over-model version internals.

---

# 33. Codex executable resolution

Phase 3 may rely on normal executable lookup through the provided PATH for:

```text
codex
```

but process execution must remain injectable/testable.

Do not introduce a generic process-execution framework.

A small Codex-specific runner seam is sufficient.

---

# 34. Codex version detection

Use the current supported Codex CLI version command.

Preserve the returned version information as raw provider evidence.

Do not create a complex semantic-version parser unless there is a current consumer.

---

# 35. Minimum Codex version

Phase 3 does not define a minimum supported Codex CLI version.

Reason:

- the current adapter uses basic documented global-instruction behavior;
- public compatibility policy has not yet been finalized;
- hardcoding a version floor without evidence would create stale policy.

Version-range enforcement may be introduced before public v1 if testing demonstrates the need.

---

# 36. Codex not installed

If Codex is not detected, the adapter must report:

```text
CODEX_NOT_DETECTED
```

or equivalent.

Default Phase 3 behavior:

> no Codex configuration mutation should be planned for an undetected provider.

This follows the architecture rule that only compatible/detected provider elements should be installed.

---

# 37. Future provider installation

Phase 3 does not install Codex itself.

If a future dependency-management layer installs Codex, it can rerun provider detection afterward.

Do not add:

```text
npm install -g @openai/codex
brew install ...
```

or equivalent provider installation behavior.

---

# 38. Provider inspection

Introduce a read-only Codex inspection result.

It should report enough facts for planning and verification.

Conceptually:

```ts
interface CodexInspection {
  detection: CodexDetection;
  globalAgents:
  ...;
  globalOverride:
  ...;
  configToml:
  ...;
}
```

Do not expose raw file contents unnecessarily in ordinary diagnostics.

---

# 39. Instruction-file inspection

For relevant instruction files, distinguish:

```text
absent
regular
symlink
unsupported
```

For safe regular override files, determine whether content is active/non-empty.

For managed `AGENTS.md`, ownership itself remains determined by Phase 2 state.

---

# 40. Provider diagnostics

Provider-specific conditions should use structured values rather than prose parsing.

Candidate diagnostic kinds:

```text
INVALID_CODEX_HOME
CODEX_NOT_DETECTED
EMPTY_GLOBAL_INSTRUCTIONS
CODEX_GLOBAL_OVERRIDE_ACTIVE
CODEX_GLOBAL_OVERRIDE_UNSAFE
```

Exact names may differ.

Do not force these into the Phase 2 generic filesystem conflict enum unless they genuinely represent installer-core
concerns.

---

# 41. Provider diagnostics vs installer conflicts

Keep the distinction:

```text
provider diagnostic
→ Codex-specific reason installation is inappropriate/ineffective

installer conflict
→ provider-neutral filesystem/ownership/safety conflict
```

Examples:

```text
active AGENTS.override.md
→ provider diagnostic

unmanaged AGENTS.md
→ installer conflict

symlinked AGENTS.md
→ installer conflict

Codex executable missing
→ provider diagnostic
```

---

# 42. Codex plan

Phase 3 should provide one Codex-specific planning entry point.

Conceptually:

```ts
planCodexGlobalInstructions(...)
```

The exact name may differ.

Its responsibility is:

1. resolve/detect Codex;
2. inspect provider-specific blockers;
3. build the desired Codex artifact;
4. construct the Phase 2 installer context;
5. delegate filesystem planning to `planInstall`;
6. return a combined provider plan.

---

# 43. Combined plan representation

A useful minimal conceptual structure:

```ts
interface CodexGlobalInstructionsPlan {
  detection: CodexDetection;
  diagnostics: readonly CodexDiagnostic[];
  installerPlan?: InstallPlan;
  canApply: boolean;
}
```

Avoid creating a generic cross-provider planning framework before Claude exists.

Phase 6 may extract common structure when a second real adapter provides evidence for it.

---

# 44. No generic ProviderAdapter interface yet

Do not introduce an elaborate generic:

```ts
ProviderAdapter < TConfig, TPlan, TVerification,
...>
```

merely because future providers exist.

Phase 3 has one real adapter.

Implement Codex cleanly first.

Extract common provider interfaces during Claude implementation only where actual duplication justifies them.

---

# 45. Installer context for Codex

The adapter should construct a Phase 2 installer context using:

```text
allowedTargetRoots = [codexHome]
```

and the caller-provided `ai-config` state directory.

The state directory must remain separate from Codex home.

---

# 46. State directory

Codex provider state continues to live in the central `ai-config` installer state:

```text
~/.ai-config
```

conceptually.

Do not create:

```text
$CODEX_HOME/.ai-config-state
```

or other provider-local duplicate state.

Tests inject temporary state paths.

---

# 47. Artifact mode

Managed global `AGENTS.md` should normally use:

```text
0644
```

unless implementation evidence demonstrates another appropriate portable mode.

Do not make it executable.

---

# 48. Applying Codex plans

Phase 3 may expose an internal provider-specific apply function that delegates to:

```text
applyInstallPlan()
```

or callers may apply the returned installer plan directly.

Choose the smaller coherent API.

Do not duplicate transaction handling.

---

# 49. Active override must block before mutation

Provider diagnostics that make Codex global guidance ineffective must be evaluated before any installer mutation begins.

Example:

```text
active override
+
managed AGENTS.md needs update

result:
canApply = false

AGENTS.md remains untouched
```

Add a direct integration test.

---

# 50. Codex verification

Phase 3 needs a provider-specific verification operation.

The purpose is to answer:

> Is the desired `ai-config` global Codex instruction artifact correctly installed and capable of being the effective
> global instruction source?

---

# 51. Verification success conditions

Verification should require:

1. Codex provider detected;
2. Codex home safely resolved;
3. no active/unsafe global override;
4. desired global instructions non-empty;
5. Phase 2 planner against the same desired artifact produces:

- no conflicts;
- no changes;
- `NOOP`;

6. managed ownership remains valid.

This proves filesystem/configuration convergence.

---

# 52. Verification does not claim model behavior

Phase 3 verification may prove:

```text
the correct Codex global instruction file is present
the file is ai-config managed
no known global override shadows it
Codex provider is detected
```

It must not claim:

```text
the model obeyed every instruction
```

That is behavioral evaluation outside this adapter.

---

# 53. Real Codex execution verification

Phase 3 automated tests must not depend on:

- real Codex authentication;
- network access;
- the owner's real Codex installation;
- ChatGPT account state.

Provider process detection should be tested with injected/fake process execution.

Actual Codex invocation may be used as optional manual evidence only.

---

# 54. No real Codex home mutation

During implementation and automated testing, do not modify the owner's actual:

```text
~/.codex
```

or currently active custom `CODEX_HOME`.

All write integration tests use temporary Codex homes.

---

# 55. Read-only real-machine inspection

Manual verification may safely run read-only commands such as:

```text
codex --version
```

and inspect the effective `CODEX_HOME` environment value.

Do not alter real global Codex files during Phase 3 manual QA.

---

# 56. Project-level AGENTS.md excluded

Phase 3 does not create or manage repository-level:

```text
AGENTS.md
AGENTS.override.md
```

Project bootstrap and project-specific provider representation belong to later phases.

Phase 3 scope is global Codex configuration only.

---

# 57. project_doc_fallback_filenames excluded

Do not modify:

```text
project_doc_fallback_filenames
project_doc_max_bytes
```

or other instruction-discovery settings inside `config.toml`.

The standard `AGENTS.md` contract is sufficient for `ai-config`.

---

# 58. AGENTS.override precedence documentation

Provider documentation must explain clearly:

```text
$CODEX_HOME/AGENTS.override.md
```

takes precedence over the normal global `AGENTS.md` when active.

This is important operational knowledge for future `doctor` and migration flows.

---

# 59. Current skill path documentation

Provider documentation may note that skills are intentionally excluded from Phase 3 and handled by the current
`.agents/skills` discovery model in later phases.

Do not implement skill support merely because the path is documented.

---

# 60. Provider documentation

Create:

```text
docs/providers/codex.md
```

The document should describe durable implemented facts:

- provider identity;
- Codex home resolution;
- managed paths;
- external/unmanaged paths;
- global AGENTS precedence;
- override behavior;
- detection;
- planning;
- verification;
- current exclusions;
- upstream-contract verification date.

Do not copy the full Phase 3 plan into it.

---

# 61. Upstream contract provenance

Because Codex behavior can change, `docs/providers/codex.md` should record which official current
documentation/contracts were used to implement the adapter.

Prefer primary sources:

- official OpenAI Codex documentation;
- official OpenAI Codex source repository where docs are insufficient.

Avoid treating community blog posts or GitHub issues as authoritative when official documentation/source exists.

---

# 62. Provider contract freshness

Do not hardcode historical assumptions into generic architecture.

Provider-specific facts belong in:

```text
docs/providers/codex.md
src/providers/codex/
```

This makes later upstream changes easier to audit.

---

# 63. Source structure

Recommended conceptual implementation area:

```text
src/providers/
├── index.ts
└── codex/
    ├── index.ts
    ├── paths.ts
    ├── detect.ts
    ├── inspect.ts
    ├── plan.ts
    └── verify.ts
```

This is illustrative.

Do not mechanically create every file.

Prefer cohesive files matching actual responsibilities.

---

# 64. Existing provider registry

The existing provider registry already identifies:

```text
codex
claude
```

Phase 3 may extend the Codex entry only as necessary to make the adapter discoverable.

Do not reintroduce speculative capability booleans.

---

# 65. No capability matrix yet

Do not add:

```text
mcp: true
hooks: true
skills: true
subagents: true
...
```

to the generic provider registry.

Phase 1 deliberately removed those speculative claims.

Provider-specific implemented behavior is stronger evidence than a premature boolean matrix.

---

# 66. Process execution safety

Codex detection must not:

- invoke a shell;
- interpolate user content into command strings;
- execute config file contents;
- execute provider-generated scripts.

Use fixed executable/arguments.

Example conceptual operation:

```text
codex --version
```

through direct process execution.

---

# 67. Detection timeout

Provider detection must not be able to hang indefinitely.

If Node's process API requires a timeout or abort mechanism, use a small bounded timeout.

Do not add a dependency solely for process timeouts.

The exact duration is an implementation detail.

---

# 68. Detection errors

Distinguish:

```text
binary not found
→ provider not detected

binary executed successfully
→ provider detected

binary exists but execution fails unexpectedly
→ detection error/diagnostic
```

Do not silently convert every process failure into "not installed."

---

# 69. Environment mutation

Provider detection must not mutate:

- PATH;
- CODEX_HOME;
- shell profiles;
- Codex authentication;
- Codex state;
- Codex config.

---

# 70. Tests — path resolution

At minimum directly test:

### Default Codex home

```text
no CODEX_HOME
homeDir = /tmp/test-home

→ /tmp/test-home/.codex
```

### Explicit Codex home

```text
CODEX_HOME = /tmp/custom-codex
→ /tmp/custom-codex
```

### Relative CODEX_HOME

```text
CODEX_HOME = ./codex
→ INVALID_CODEX_HOME
```

### Unsafe/symlinked Codex home

Must be rejected by the relevant safe path/provider planning logic.

---

# 71. Tests — detection

At minimum cover:

```text
Codex executable detected
Codex executable missing
Codex --version unexpected failure
raw version output retained
no shell used
```

Use a narrow injected runner or fake executable setup.

Do not require actual Codex.

---

# 72. Tests — override behavior

At minimum cover:

```text
override absent
→ normal AGENTS planning

override whitespace-only
→ normal AGENTS planning

override non-empty
→ provider blocker, no mutation

override symlink
→ provider blocker, no mutation

override directory/unsupported object
→ provider blocker, no mutation
```

---

# 73. Tests — AGENTS ownership

At minimum cover:

```text
AGENTS absent
→ CREATE

managed same desired content
→ NOOP

managed previous content
→ REPLACE_MANAGED

managed local drift
→ conflict

unmanaged existing AGENTS
→ conflict

symlinked AGENTS
→ conflict
```

Use Phase 2 rather than duplicating its classification logic.

---

# 74. Tests — config.toml preservation

Create a temporary Codex home containing:

```text
config.toml
```

with fixture bytes and mode.

Run Codex global-instructions planning/application.

Verify:

```text
config.toml bytes unchanged
config.toml mode unchanged
```

The adapter must not manage it.

---

# 75. Tests — provider absent

If Codex detection says provider is unavailable:

```text
no installer mutation plan is applicable
```

and no Codex home should be created merely by planning.

---

# 76. Tests — empty instructions

Whitespace-only desired global instructions:

```text
→ provider diagnostic
→ no installer apply
```

No empty managed `AGENTS.md` should be created.

---

# 77. Tests — isolated application

Integration test:

```text
temporary HOME
temporary CODEX_HOME
temporary ai-config stateDir
fake detected Codex
no override
desired global instructions
        ↓
plan
        ↓
apply
        ↓
verify
```

Expected:

```text
AGENTS.md created
correct bytes
0644
managed state recorded
verification PASS
```

---

# 78. Tests — idempotence

After successful isolated application:

```text
plan identical Codex desired configuration again
```

Expected:

```text
installer NOOP
provider verification PASS
no rewrite
```

---

# 79. Tests — managed update

After initial managed install:

```text
new canonical global content
```

Expected:

```text
REPLACE_MANAGED
backup generated by installer core
apply succeeds
verify succeeds
```

The adapter must not implement its own backup system.

---

# 80. Tests — active override after installation

Scenario:

```text
managed AGENTS.md exists
        ↓
external active AGENTS.override.md added
        ↓
verify
```

Expected:

```text
verification FAIL / shadowed
```

Do not modify either file.

---

# 81. Tests — config remains external

Even after successful Codex adapter installation, Phase 2 state must not contain ownership records for:

```text
config.toml
AGENTS.override.md
```

Only the intended managed `AGENTS.md` belongs to Phase 3.

---

# 82. Tests — no skills side effects

After Codex adapter apply, assert Phase 3 did not create:

```text
.agents/skills
$CODEX_HOME/skills
.codex/skills
```

or any other skill directory.

---

# 83. Tests — no real environment access

Tests must demonstrate they use injected:

```text
homeDir
env
stateDir
process runner
```

where required.

No test should depend on:

```text
process.env.CODEX_HOME
real HOME
real PATH Codex
```

unless explicitly testing a thin production-boundary resolver and safely restoring all values.

Prefer dependency injection over mutating process globals.

---

# 84. Existing Phase 1/2 regression suite

All existing tests must remain green.

Phase 3 must not weaken:

- launcher safety;
- installer path safety;
- state safety;
- transaction behavior;
- rollback;
- ownership rules.

---

# 85. Production dependencies

Preferred result:

```text
None.
```

Node built-ins should be sufficient for:

- path handling;
- filesystem inspection;
- child-process detection.

If a production dependency appears necessary, stop and justify it before adding it.

---

# 86. No TOML dependency

Do not add a TOML parser in Phase 3.

`config.toml` is not being mutated.

A TOML parser would have no current production consumer.

---

# 87. Public CLI

Phase 3 does not yet expose a real public:

```text
ai-config setup
ai-config provider codex
```

command.

The adapter is implemented and tested internally first.

Public orchestration will be added when enough canonical configuration exists to make `setup` meaningful.

---

# 88. Package contents

Do not expand the npm package public surface merely because new internal modules exist.

The current package still exposes only the pre-release CLI surface.

Public packaging of installer/provider runtime modules should happen when the CLI actually consumes them.

---

# 89. Security review

Before completion, perform a focused Codex-adapter security review.

Inspect specifically for:

```text
CODEX_HOME path injection
relative-path ambiguity
symlinked Codex home
override symlink following
unmanaged AGENTS overwrite
config.toml mutation
shell command injection
real HOME leakage in tests
provider diagnostics bypass
active override false-success
```

---

# 90. Upstream compatibility review

Before reporting Phase 3 complete, reconfirm from current primary Codex sources:

- global instruction filenames;
- override precedence;
- `CODEX_HOME` semantics;
- `config.toml` location.

If these contracts changed during implementation, report before silently changing the approved plan.

Skills-path changes do not block Phase 3 because skills remain outside scope.

---

# 91. Architecture documentation

Phase 3 should not modify the Master Architecture unless a material contradiction is discovered.

Add/update only provider-specific durable documentation:

```text
docs/providers/codex.md
```

and any concise architecture index links needed to make it discoverable.

---

# 92. Root README

Do not advertise production Codex setup yet.

The root README may receive a small status update only if necessary to remain accurate.

Avoid claiming:

```text
npx ... setup
```

works before the setup orchestration actually exists.

---

# 93. Manual verification

After automated review passes, owner manual QA should include:

- inspect `docs/providers/codex.md`;
- inspect Codex path/detection output from isolated tests;
- inspect one temporary managed `AGENTS.md`;
- inspect one provider plan with no override;
- inspect provider result with active override;
- confirm temporary `config.toml` remains unchanged;
- confirm no skills directories are created;
- confirm no real `~/.codex` changes occurred.

Codex should provide exact commands/files for this review.

---

# 94. Optional real-provider read-only check

If Codex is installed on the owner's Mac, manual QA may run:

```text
codex --version
```

and inspect the current `CODEX_HOME` value.

This is read-only provider evidence.

Do not modify real provider files.

---

# 95. Verification operation terminology

Provider verification should distinguish outcomes such as:

```text
verified
not installed
override active
unsafe override
filesystem conflict
drifted
missing
```

Exact implementation may use discriminated unions.

Do not return a single ambiguous boolean if useful diagnostics would be lost.

---

# 96. No provider behavioral eval

Phase 3 does not evaluate whether Codex follows instruction quality well.

That is a different concern from provider configuration correctness.

The future global contract can be behaviorally evaluated after Phase 4.

---

# 97. Completion report

After implementation return:

## Status

Exactly one:

```text
COMPLETE — awaiting manual verification
BLOCKED — owner decision required
```

## Baseline inspected

Repository and Git state before implementation.

## Upstream contract verification

State which current primary Codex contracts were reconfirmed:

- CODEX_HOME;
- global AGENTS;
- override precedence;
- config location.

## Files created

Exact repository-relative paths.

## Files modified

Exact paths and purpose.

## Production dependencies

If none:

```text
None.
```

## Development dependencies

If none:

```text
None.
```

## Codex detection model

Explain:

- home resolution;
- executable detection;
- version evidence;
- provider-not-found behavior.

## Codex path model

Show final paths:

```text
home
AGENTS.md
AGENTS.override.md
config.toml
```

## Ownership model

State explicitly:

```text
AGENTS.md → managed
AGENTS.override.md → external/unmanaged
config.toml → external/unmanaged
skills → not Phase 3
```

## Override behavior

Explain all active/inactive/unsafe cases.

## Planning model

Explain how Codex-specific provider diagnostics compose with Phase 2 installer planning.

## Verification model

Explain exactly what PASS proves and what it does not prove.

## Test evidence

Exact commands + PASS/FAIL.

## Integration scenarios

Map the required scenarios to test names.

## Security review

Summarize findings and corrections.

## Known gaps

State all intentional gaps.

## Deviations from approved plan

If none:

```text
None.
```

## Open decisions before Phase 4

If none:

```text
None.
```

## Commit status

End exactly with:

```text
No commit created. Awaiting explicit owner instruction.
```

---

# 98. Required automated verification

At minimum run:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run build
npm run check
npm run pack:check
```

Also verify:

```text
existing CLI --help
existing CLI --version
existing launcher tests
all Phase 2 installer tests
```

---

# 99. Codex-specific verification evidence

Provide explicit PASS/FAIL evidence for:

```text
default Codex home
custom CODEX_HOME
relative CODEX_HOME rejection
Codex detected
Codex missing
Codex detection failure
empty instructions
override absent
override whitespace-only
override active
override unsafe
fresh AGENTS create
managed AGENTS NOOP
managed AGENTS replace
managed AGENTS drift
unmanaged AGENTS conflict
AGENTS symlink conflict
config.toml preservation
provider absent no mutation
isolated application
idempotent verification
active override after installation
no skills side effects
```

---

# 100. Self-review

Before completion:

1. inspect complete diff;
2. compare with Master Architecture;
3. compare with Phase 3 plan;
4. check provider-neutral installer boundaries;
5. inspect every `CODEX_HOME` use;
6. inspect every provider filesystem path;
7. inspect every process execution call;
8. inspect override detection;
9. inspect unmanaged content preservation;
10. confirm no `config.toml` writes;
11. confirm no skills work;
12. inspect test environment isolation;
13. inspect production dependency count;
14. remove speculative abstractions;
15. remove provider behavior that belongs to later phases.

---

# 101. Phase 3 approved decisions

Approval of this plan approves the following Phase 3 decisions.

## D3-1 — Managed global Codex file

```text
$CODEX_HOME/AGENTS.md
```

is the only provider file managed by Phase 3.

---

## D3-2 — Global override

```text
$CODEX_HOME/AGENTS.override.md
```

remains external/unmanaged.

An active override blocks Codex global-instruction apply/verification.

---

## D3-3 — config.toml

```text
$CODEX_HOME/config.toml
```

is read-only/external in Phase 3.

No TOML merging is implemented.

---

## D3-4 — Skills

Codex skills are completely deferred to later phases.

---

## D3-5 — Canonical AGENTS content

Final production global `AGENTS.md` content is deferred to Phase 4.

Phase 3 consumes supplied canonical instruction content.

---

## D3-6 — Provider detection

Codex must be detected before its configuration is considered applicable.

Phase 3 does not install Codex.

---

## D3-7 — CODEX_HOME

Use explicit `CODEX_HOME` when supplied; otherwise use:

```text
<homeDir>/.codex
```

Relative or unsafe values are rejected.

---

## D3-8 — Adapter abstraction

Implement a concrete Codex adapter.

Do not create a broad generic provider-adapter framework yet.

---

## D3-9 — Filesystem mutation

All writes use the existing Phase 2 installer.

No Codex-specific write/backup/rollback engine is allowed.

---

## D3-10 — Override false-success prevention

An active or unsafe `AGENTS.override.md` blocks the operation before mutation.

---

## D3-11 — Existing unmanaged AGENTS

Existing unmanaged `AGENTS.md` is preserved and conflicts.

No implicit adoption.

---

## D3-12 — Project scope

Only global Codex configuration is implemented.

Repository/project Codex instructions are deferred.

---

## D3-13 — Public CLI

No production provider setup command is added in Phase 3.

---

## D3-14 — Dependencies

Prefer zero new production dependencies.

No TOML library.

---

# 102. Decisions intentionally deferred

Phase 3 does not decide:

- final global `AGENTS.md` contents;
- global skills;
- skill invocation metadata;
- `.agents/skills` installation;
- plugin packaging;
- external skill sources;
- Matt Pocock skill adaptation;
- OMX skill adaptation;
- `config.toml` ownership;
- TOML managed regions/merge;
- project-level AGENTS generation;
- repository bootstrap;
- provider capability matrix;
- MCP;
- hooks;
- Codex subagents;
- model selection;
- reasoning effort defaults;
- approval policy;
- sandbox policy;
- provider installation;
- Codex authentication;
- public setup orchestration;
- migration of current real `~/.codex`;
- removal/adoption of current OMX configuration.

These belong to later phases.

---

# 103. Open decisions before implementation

No separate owner decision is required if this plan is approved as written.

Approval of this document approves the decisions in section 101.

If any of those decisions should change, update this plan before implementation begins.

---

# 104. Implementation sequence

## Step 1 — inspect baseline

Read completely:

```text
docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md
docs/architecture/installer-core.md
docs/plans/PHASE-2-INSTALLER-CORE.md
docs/plans/PHASE-3-CODEX-ADAPTER.md
```

Inspect:

```text
repository tree
provider registry
installer APIs
tests
package configuration
Git status
```

---

## Step 2 — reconfirm current Codex contracts

Using current primary OpenAI sources, verify:

```text
CODEX_HOME
global AGENTS.md
AGENTS.override.md precedence
config.toml location
```

Do not rely solely on historical notes.

---

## Step 3 — implement Codex paths

Add deterministic, injected Codex-home/path resolution.

No mutation.

---

## Step 4 — implement Codex executable detection

Use direct process execution.

Add deterministic tests.

---

## Step 5 — implement provider inspection

Inspect:

```text
AGENTS.md
AGENTS.override.md
config.toml
```

without claiming ownership.

---

## Step 6 — implement provider diagnostics

Add the minimal Codex-specific blockers required by this plan.

---

## Step 7 — implement desired AGENTS artifact translation

Translate supplied canonical instruction content into:

```text
codex.global.instructions
→ $CODEX_HOME/AGENTS.md
```

---

## Step 8 — integrate Phase 2 planner

Build the Codex global-instruction plan by composing provider diagnostics with the existing installer plan.

Do not duplicate installer logic.

---

## Step 9 — implement isolated apply path if needed

Delegate exclusively to Phase 2 transaction handling.

No real Codex-home mutation.

---

## Step 10 — implement verification

Verify converged managed state and override effectiveness.

---

## Step 11 — integration tests

Implement the complete Phase 3 scenario matrix.

---

## Step 12 — provider documentation

Create:

```text
docs/providers/codex.md
```

based on actual implementation and currently verified upstream contracts.

---

## Step 13 — full automated verification

Run all project checks.

---

## Step 14 — focused security/provider review

Inspect Codex path resolution, override handling, process execution and ownership boundaries.

---

## Step 15 — anti-slop review

Remove:

- unnecessary generic adapter abstractions;
- duplicated installer behavior;
- speculative capabilities;
- unused version parsing;
- unnecessary config models;
- future skill/plugin code.

---

## Step 16 — completion report

Return the required evidence.

---

## Step 17 — STOP

Do not:

- commit;
- start Phase 4;
- design final global AGENTS content;
- install skills;
- install plugins;
- mutate config.toml;
- touch real `~/.codex`;
- migrate OMX;
- publish;
- push;
- tag;
- release.

Wait for external review and owner manual QA.

---

# 105. Definition of Done

Phase 3 is complete only when:

- Codex adapter exists as a concrete provider implementation;
- current Codex global instruction contract has been reconfirmed from primary sources;
- default Codex home resolves correctly;
- custom absolute `CODEX_HOME` resolves correctly;
- relative/unsafe Codex home is rejected;
- Codex executable detection is read-only and shell-free;
- missing Codex is represented clearly;
- global `AGENTS.md` can be represented as a managed desired artifact;
- final production AGENTS content has not yet been invented;
- empty desired instructions are rejected;
- active global override is detected;
- active override blocks mutation;
- unsafe override blocks mutation;
- whitespace-only safe override does not block;
- override is never modified;
- config.toml is never modified;
- existing unmanaged AGENTS is preserved;
- managed AGENTS uses Phase 2 ownership/planning;
- managed drift remains a conflict;
- fresh isolated AGENTS installation succeeds;
- identical re-plan is NOOP;
- managed update succeeds through Phase 2;
- provider verification detects converged state;
- provider verification detects subsequent override shadowing;
- provider absence prevents provider configuration mutation;
- no skills directories are created;
- no plugin behavior is introduced;
- no project AGENTS behavior is introduced;
- no real user Codex home is modified by tests;
- no real provider auth is required;
- existing Phase 1/2 regression tests pass;
- no unnecessary production dependency is introduced;
- provider documentation accurately reflects the implementation;
- manual QA passes;
- no material open decision blocks Phase 4.

---

# 106. Phase invariant

The governing constraint for Phase 3 is:

> **Teach ai-config how Codex represents global instructions without yet deciding what those instructions should say.**

Phase 3 provides the Codex delivery mechanism.

Phase 4 provides the actual working contract.
