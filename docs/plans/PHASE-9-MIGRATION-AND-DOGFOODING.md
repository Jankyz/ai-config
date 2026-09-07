# AI Config — Phase 9: Migration and Dogfooding

**Status:** approved for implementation
**Approved:** 2026-09-07
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-8-UI-EXTENSION-BUNDLE.md`  
**Phase:** 9 of 10  
**Primary real-world dogfood target:** Codex  
**Claude:** isolated verification only unless explicitly requested  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Prove that `ai-config` can safely configure and maintain a real coding-agent environment before public release.

Phase 9 introduces the minimal user-facing orchestration required to dogfood the package and validates:

```text
clean installation
existing-environment migration
ownership/adoption
idempotent updates
doctor
rollback
package execution
real Codex environment
project workflow
```

The phase must separate:

```text
isolated technical verification
→ real-environment read-only audit
→ owner approval
→ real migration
→ post-migration dogfooding
```

No real user environment may be modified before the explicit migration approval gate.

---

## 2. Core invariant

> Observing the real environment never authorizes changing it.

And:

> Existing user files are preserved unless ai-config already owns them or the owner explicitly approves adoption.

---

## 3. Minimal public CLI

Phase 9 introduces only the commands required for actual setup and maintenance:

```text
ai-config setup
ai-config update
ai-config doctor
ai-config rollback
```

Do not create a broad administration framework.

Do not expose Phase 7 source-management commands.

Do not expose plugin-management commands.

---

## 4. Provider selection

Mutating provider operations require an explicit provider:

```text
--provider codex
--provider claude
```

No silent provider selection.

Examples:

```text
ai-config setup --provider codex
ai-config setup --provider codex --apply

ai-config update --provider codex
ai-config update --provider codex --apply
```

Codex is the real Phase 9 dogfood target.

Claude must be verified with isolated roots only unless the owner explicitly requests real Claude migration.

---

## 5. Preview-first mutation model

`setup`, `update`, and `rollback` are preview-first.

Without:

```text
--apply
```

they must not mutate managed configuration.

Example:

```text
ai-config setup --provider codex
```

produces the exact proposed action plan.

Only:

```text
ai-config setup --provider codex --apply
```

may execute it.

The same rule applies to `update` and `rollback`.

Do not rely on interactive yes/no prompts as the safety boundary.

The command itself must express mutation intent.

---

## 6. `setup`

`setup` establishes the desired ai-config environment for one provider.

It must orchestrate the already implemented:

```text
global instructions
canonical standards
canonical skills
provider representation
Phase 2 installer/state
```

It must preserve:

- unmanaged unrelated files;
- provider settings outside ai-config ownership;
- secrets;
- external plugins;
- existing project files.

Repeated setup on an already converged environment must produce:

```text
NOOP
```

---

## 7. `update`

`update` applies the desired state from the currently executing ai-config package to an environment already known to
ai-config.

It must:

- validate current state;
- detect drift;
- verify provider blockers;
- plan changes before writing;
- create normal Phase 2 transaction/backup evidence;
- preserve unmanaged content;
- fail closed on conflicts.

Running update when already current must produce:

```text
NOOP
```

Do not make `update` update the npm package itself.

Package-version acquisition remains the caller's responsibility:

```text
npx <version>
bunx <version>
```

or equivalent.

---

## 8. `doctor`

`doctor` is always read-only.

It should report concise structured health for:

```text
runtime
package
state
provider detection
provider target roots
managed artifacts
drift
conflicts
override blockers
canonical skill availability
upstream registry/lock validity
recovery-required state
```

With no provider argument, it may report general environment health and available provider status.

With:

```text
--provider codex
```

or:

```text
--provider claude
```

it should include provider-specific readiness.

`doctor` must not repair anything.

---

## 9. `rollback`

Expose the existing transaction rollback capability through a small safe CLI.

Require an explicit transaction identity.

Conceptually:

```text
ai-config rollback --transaction <id>
ai-config rollback --transaction <id> --apply
```

Without `--apply`, show the rollback plan only.

Do not implement an ambiguous destructive:

```text
rollback everything
```

or silently choose a transaction.

Rollback must preserve the Phase 2 recovery and uncertainty guarantees.

---

## 10. Migration ownership rules

Real-environment migration must classify every relevant artifact as:

```text
managed
adoptable
unmanaged
conflict
blocked
```

### Managed

Already owned by ai-config.

Normal setup/update semantics apply.

### Adoptable

An existing regular artifact whose bytes and required mode exactly match the current desired ai-config artifact.

Adoption:

- requires explicit `--apply`;
- must not rewrite identical bytes;
- records ai-config ownership/provenance;
- must be reversible as an ownership transition.

### Unmanaged

Unrelated user/provider content.

Never modify it.

### Conflict

A canonical ai-config target already exists but differs materially from desired content.

Do not overwrite or merge automatically.

### Blocked

Unsafe filesystem state, provider override, recovery state, unsupported custom root, or another existing safety blocker.

Fail closed.

---

## 11. Adoption semantics

Phase 9 may complete the previously deferred adopted-artifact workflow only as required for migration.

Required invariant:

> Adoption changes ownership metadata, not existing matching content.

After adoption, future explicitly applied ai-config updates may maintain that artifact according to normal desired-state
rules.

Rollback of the original adoption transaction must preserve the pre-existing file and remove only the ownership
transition where no file mutation occurred.

Do not adopt:

- differing content;
- symlinks;
- unsupported objects;
- partially matching directories;
- unrelated files.

---

## 12. Existing Codex environment

The real Codex audit must establish facts rather than assume current layout.

Inspect read-only:

```text
CODEX_HOME
global AGENTS.md
AGENTS.override.md
user skill locations
existing aic-* skills
ai-config state
relevant file types/modes
```

Also inspect provider detection/version information already supported by the adapter.

Do not modify:

```text
config.toml
authentication
MCP configuration
plugins
unrelated skills
```

---

## 13. No personal data in repository

Real-machine migration information must not be committed into the public `ai-config` repository.

Do not create source-controlled reports containing:

- username;
- absolute home paths;
- personal repository names;
- local secrets;
- unrelated installed tools;
- user-specific configuration content.

Real-environment audit results should be:

- returned in the agent completion report; or
- stored only in an ignored/private temporary location when technically required.

---

## 14. Stage A — isolated clean-install dogfood

Before touching the real home directory, build/package the current repository and test the actual distributable artifact
against isolated temporary environments.

Use the packed package rather than importing source modules directly.

Verify:

```text
setup preview
setup apply
doctor
repeated setup → NOOP
update preview
update same version → NOOP
rollback preview
rollback apply
re-setup
```

for Codex.

Repeat provider representation verification for Claude using an isolated home/config root.

No automated test may mutate the real `$HOME`, real `CODEX_HOME`, or real Claude configuration.

---

## 15. Package execution surface

Dogfood the actual packaged executable in a way equivalent to intended:

```text
npx ai-config ...
```

behavior without publishing Phase 9 to the public registry.

Use a locally packed tarball/package artifact.

The objective is to verify:

```text
package files
bin launcher
runtime resolution
CLI parsing
installer orchestration
state
```

as the public artifact will experience them.

Do not rely only on running source TypeScript directly.

---

## 16. Node.js 24 verification

Phase 9 must close the known runtime verification gap.

The package baseline remains:

```text
Node.js 24
```

Run the complete relevant package/CLI dogfood using an actual Node.js 24 runtime.

Do not claim Node 24 verification when the executing binary is another major version.

Report the exact runtime version used.

If Node 24 is unavailable:

```text
BLOCKED FOR PUBLIC RELEASE
```

until verified locally or through authoritative CI execution.

---

## 17. Bun verification

The public launcher is intended to support Bun fallback / `bunx`.

If Bun is available, dogfood the packaged executable using the actual Bun runtime.

Record the exact Bun version.

If Bun is not available:

- do not install it automatically;
- record the gap explicitly;
- require equivalent evidence before Phase 10 public release.

Bun absence does not block the rest of Phase 9.

---

## 18. Isolated migration fixtures

In addition to clean-home testing, test migration scenarios with isolated pre-existing environments.

Required cases:

```text
exact desired file → ADOPT
different canonical file → CONFLICT
unrelated file → PRESERVE
same-name different skill → CONFLICT
symlink target → BLOCK
unsafe override → BLOCK
managed drift → detected
recovery-required state → BLOCK
```

Verify rollback behavior for adoption separately.

---

## 19. Real-environment audit gate

After all isolated verification passes, perform a read-only audit of the real Codex environment.

Return an exact migration proposal containing:

```text
provider
detected roots
current ai-config state
artifacts to CREATE
artifacts to ADOPT
artifacts to UPDATE
artifacts to PRESERVE
CONFLICTS
BLOCKERS
backup/transaction behavior
expected final state
```

Do not apply it.

Then STOP with:

```text
OWNER MIGRATION APPROVAL REQUIRED
```

if any real mutation is proposed.

This is a mandatory Phase 9 gate.

---

## 20. Real migration

Only after explicit owner approval of the real migration proposal may the agent execute:

```text
setup --provider codex --apply
```

or the exact approved equivalent.

Use the packaged Phase 9 artifact, not an ad-hoc internal script.

After application immediately run:

```text
doctor
setup preview
```

The expected result is:

```text
healthy
+
NOOP
```

Any unexpected drift/conflict after migration is a failure.

---

## 21. Real rollback

Do not deliberately roll back a healthy real environment solely as a test.

Rollback must be exhaustively verified in isolated dogfood environments.

On the real machine, use rollback only:

- if migration produced an unexpected result; or
- if explicitly requested by the owner.

---

## 22. Project bootstrap dogfood

Verify the existing project bootstrap capability separately in an isolated temporary Git repository.

Required technical checks:

```text
empty/supported repo → expected seed
existing canonical regular files → PRESERVE
unsafe objects → CONFLICT
second run → no destructive changes
```

Do not bootstrap the real `ai-config` repository itself as a migration test.

A real personal/project repository may be used only after explicit owner selection.

---

## 23. Real interactive Codex acceptance

Automated filesystem verification is authoritative for installation correctness.

A live model interaction is not required to prove that an instruction was obeyed.

After successful migration, owner acceptance may consist only of a minimal real Codex usability check, for example:

```text
new Codex session recognizes normal global workflow
+
one explicit aic-* skill can be invoked naturally
```

Do not manufacture a large manual QA checklist.

Do not spend model/API usage merely to prove filesystem facts already verified technically.

---

## 24. Claude Phase 9 boundary

Because Claude is not currently part of the owner's active workflow:

- verify Claude setup/update/doctor/rollback in isolated roots;
- verify canonical skill rendering and convergence;
- do not mutate the real Claude home;
- do not require live Claude model dogfooding.

Real Claude migration is deferred until actually needed.

This remains a known but non-blocking dogfood limitation before Phase 10 review.

---

## 25. CLI output

CLI output should be concise and operational.

For preview operations clearly show:

```text
CREATE
ADOPT
UPDATE
PRESERVE / NOOP
CONFLICT
BLOCKED
```

Applied mutations must report the resulting transaction ID.

Errors must be actionable without dumping secrets or entire private configuration files.

Do not build a TUI.

---

## 26. Exit behavior

Use deterministic non-zero exit status for:

```text
invalid arguments
conflict
blocked/recovery-required state
failed apply
failed rollback
unhealthy required doctor condition
```

Safe preview/NOOP should succeed.

Do not invent a large public exit-code taxonomy unless required.

---

## 27. Tests

Add deterministic integration coverage for the public command layer.

At minimum:

### CLI

- help/version remain working;
- provider required for mutating provider commands;
- preview does not mutate;
- `--apply` performs approved transaction;
- unknown flags fail;
- rollback requires explicit transaction.

### Setup/update

- clean setup;
- repeat → NOOP;
- exact existing artifact → ADOPT;
- differing artifact → CONFLICT;
- unmanaged preservation;
- drift detection;
- update without valid state handled safely.

### Doctor

- healthy;
- drift;
- conflict/blocker;
- recovery required;
- registry/lock invalid.

### Rollback

- managed creation rollback;
- update rollback;
- adoption rollback preserves pre-existing file.

### Package artifact

Run representative CLI flows from the packed package in isolated roots.

---

## 28. Documentation

Create/update only what is required for the actual public-facing behavior:

```text
docs/architecture/migration-and-dogfooding.md
README.md
docs/providers/codex.md
docs/providers/claude.md
```

Document concise examples for:

```text
setup
update
doctor
rollback
preview vs --apply
```

Do not write final release documentation yet.

That belongs to Phase 10.

---

## 29. Explicitly outside Phase 9

Do not:

- publish to npm;
- create a public release/tag;
- publish GitHub release;
- auto-update upstream external skills;
- expand Phase 8 capabilities;
- migrate real Claude configuration;
- modify provider authentication;
- modify Codex `config.toml`;
- add telemetry;
- add auto-update;
- add interactive TUI;
- install Node/Bun/21st automatically;
- migrate arbitrary projects without owner selection.

---

## 30. Definition of Done

Phase 9 is complete when:

- minimal public setup/update/doctor/rollback orchestration exists;
- all mutations are preview-first and require `--apply`;
- migration ownership/adoption semantics are implemented and tested;
- packed-artifact clean installation passes;
- actual Node.js 24 execution is verified;
- Bun execution is verified or explicitly recorded as a Phase 10 release gap;
- Codex clean setup/update/doctor/rollback passes in isolation;
- Claude equivalent behavior passes in isolation;
- project bootstrap passes isolated dogfood;
- real Codex environment receives a read-only migration audit;
- owner explicitly approves any real migration;
- approved real Codex migration converges to healthy + NOOP;
- no unrelated user/provider state is modified;
- no personal environment data is committed;
- full repository verification passes;
- package content remains intentional;
- no commit occurs without owner instruction.

---

## 31. Implementation sequence

### Part 1 — repository implementation

1. Inspect existing CLI and Phase 2–8 orchestration APIs.
2. Implement the minimal command layer.
3. Implement only missing explicit adoption behavior required for migration.
4. Add doctor aggregation.
5. Add safe rollback CLI.
6. Add deterministic CLI/integration tests.
7. Update concise documentation.
8. Run full repository verification.

No real user-home mutation in Part 1.

### Part 2 — isolated dogfood

9. Pack the actual package.
10. Dogfood it in isolated temporary Codex and Claude environments.
11. Verify clean setup, NOOP, update, doctor and rollback.
12. Verify actual Node 24.
13. Verify Bun when available.
14. Dogfood project bootstrap in an isolated repo.

### Part 3 — real audit

15. Audit the real Codex environment read-only.
16. Produce exact migration proposal.
17. STOP for owner approval.

### Part 4 — real migration

Only after owner approval:

18. Apply the exact approved migration using the packaged CLI.
19. Run doctor.
20. Re-run setup preview and require NOOP.
21. Report real dogfood outcome.
22. STOP — no Phase 10 and no commit without owner instruction.

---

## 32. Completion reporting

Because Phase 9 contains a mandatory owner gate, do not pretend the entire phase can complete in one uninterrupted
execution.

### Before real migration

Return:

```text
STATUS — MIGRATION APPROVAL REQUIRED
```

with:

- implementation verification;
- package-artifact dogfood;
- exact Node runtime;
- Bun status;
- isolated Codex results;
- isolated Claude results;
- bootstrap results;
- real Codex read-only audit;
- exact proposed CREATE / ADOPT / UPDATE / PRESERVE / CONFLICT / BLOCKED actions;
- transaction/backup expectations;
- files changed in the ai-config repository;
- deviations;
- known gaps.

End:

```text
No real environment changes applied. Awaiting explicit owner migration approval.
```

### After approved migration

Return:

```text
STATUS — COMPLETE, awaiting external re-review
```

with:

- exact approved migration actions;
- transaction ID;
- post-migration doctor result;
- convergence/NOOP result;
- preserved unmanaged state;
- rollback availability;
- Node/Bun dogfood status;
- remaining Phase 10 release gaps;
- verification commands and counts;
- repository commit status.

End exactly:

```text
No commit created. Awaiting explicit owner instruction.
```

---

## 33. Approved decisions

Approval of this plan approves:

1. Phase 9 introduces minimal public `setup`, `update`, `doctor`, and `rollback` commands.
2. Mutating commands are preview-first and require explicit `--apply`.
3. Mutating provider commands require explicit provider selection.
4. Exact matching pre-existing artifacts may be adopted.
5. Different existing canonical targets remain conflicts and are never overwritten automatically.
6. Adoption is an ownership transition, not a content rewrite.
7. Real migration always requires a separate owner approval after read-only audit.
8. Codex is the real Phase 9 dogfood provider.
9. Claude is isolated-only in Phase 9.
10. Local packed artifacts are used before public npm publication.
11. Node.js 24 must be genuinely verified.
12. Bun is tested when available and never installed automatically.
13. Real rollback is not performed merely for testing.
14. No personal migration report enters the public repository.
15. Phase 9 does not publish or release ai-config.

---

## Phase invariant

> **Prove the migration before performing the migration, and prove convergence immediately after it.**
