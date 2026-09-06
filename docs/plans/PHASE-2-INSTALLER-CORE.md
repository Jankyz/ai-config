# AI Config — Phase 2: Installer Core Implementation Plan

**Status:** approved for implementation
**Approved:** 2026-09-06
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-1-REPOSITORY-FOUNDATION.md`  
**Phase:** 2 of 10  
**Runtime baseline:** Node.js 24  
**Primary target:** macOS  
**Implementation authority:** no implementation before explicit owner approval  
**Commit authority:** no commits without explicit owner instruction

---

# 1. Goal

Implement the provider-neutral installer core required for future Codex, Claude, skills, standards, templates, and
dependency installation.

Phase 2 establishes safe primitives for:

- environment detection;
- path safety;
- desired artifact representation;
- current-state inspection;
- ownership classification;
- content hashing;
- drift detection;
- deterministic install planning;
- dry-run;
- conflict detection;
- transaction locking;
- backups;
- transactional filesystem mutation;
- same-process rollback on failed transactions;
- installer state;
- transaction receipts;
- incomplete-transaction detection;
- isolated integration testing.

The outcome of Phase 2 is a safe configuration mutation engine.

It must not yet know how Codex or Claude are configured.

---

# 2. Governing architecture

All implementation must comply with:

`docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`

The Master Architecture remains authoritative for durable project-wide decisions.

This Phase 2 plan refines the installer architecture but must not silently change it.

If implementation evidence reveals a material contradiction with the Master Architecture:

1. stop the affected branch;
2. establish facts;
3. document the conflict;
4. present options;
5. provide a recommendation;
6. obtain owner approval;
7. update the architecture if required;
8. continue only after the conflict is resolved.

---

# 3. Previous-phase baseline

Phase 1 established:

- Node.js 24;
- TypeScript;
- ESM;
- npm;
- zero production runtime dependencies;
- provider-neutral source boundaries;
- portable `npx` / `bunx` launcher architecture;
- minimal Codex/Claude identity seam;
- strict type checking;
- unit/integration testing;
- isolated HOME testing;
- CI;
- package-content control;
- public-repository hygiene.

Phase 2 builds on this foundation.

Do not replace or redesign Phase 1 infrastructure without concrete evidence that a change is required.

---

# 4. Core invariant

The installer core must remain:

> **provider-neutral**

It operates on desired filesystem artifacts and installation metadata.

It does not understand concepts such as:

```text
AGENTS.md
CLAUDE.md
Codex skills
Claude skills
MCP servers
21st
Matt Pocock
OMX
```

Those concepts belong to later adapters/source managers.

The Phase 2 installer receives already-resolved artifact intentions from future higher layers.

---

# 5. Safety invariant

The most important Phase 2 rule is:

> **Unknown existing user content is preserved by default.**

The installer must never silently overwrite an existing artifact whose ownership has not been established.

When uncertain:

```text
preserve
→ report conflict
→ require explicit resolution
```

not:

```text
guess
→ overwrite
```

---

# 6. Phase 2 scope

## Included

Phase 2 includes:

- provider-neutral environment metadata detection;
- explicit installer context;
- explicit HOME/state roots;
- allowed target roots;
- path validation;
- safe filesystem inspection;
- SHA-256 content hashing;
- desired artifact model;
- installed artifact state model;
- ownership model;
- managed/unmanaged classification;
- adopted ownership representation;
- drift detection;
- deterministic install plan;
- plan action model;
- conflict model;
- dry-run;
- installer state schema v1;
- transaction IDs;
- receipts;
- backups;
- transaction lock;
- atomic regular-file writes where practical;
- rollback of current transaction on failure;
- incomplete transaction detection;
- injectable filesystem/environment boundaries where necessary for testing;
- unit tests;
- isolated filesystem integration tests;
- documentation of installer-core contracts.

---

# 7. Explicitly excluded

Do not implement:

- Codex filesystem rules;
- Claude filesystem rules;
- `CODEX_HOME` behavior;
- `CLAUDE_CONFIG_DIR` or equivalent Claude behavior;
- global `AGENTS.md`;
- global `CLAUDE.md`;
- skills installation;
- standards installation;
- project templates;
- project bootstrap;
- GitHub downloading;
- Matt Pocock skills;
- OMX skills;
- 21st;
- npm dependency installation;
- external source registry;
- final canonical manifest schema;
- public `setup` command;
- public `update` command;
- public `doctor` command;
- public `status` command;
- public rollback CLI;
- provider capability matrix;
- credentials;
- authentication;
- network requests;
- package publishing;
- real-user environment migration.

These belong to later phases.

---

# 8. No real machine mutation

Phase 2 implementation and automated tests must not modify the developer's actual:

```text
~/.ai-config
~/.codex
~/.claude
```

or any other active AI-provider configuration.

Integration tests must use temporary directories.

Every installer operation must accept an explicit environment/context rather than secretly depending on the developer's
real HOME.

---

# 9. No public setup command yet

Phase 2 implements installer primitives, not a user-facing production installer.

Do not expose:

```bash
ai-config setup
```

as a working configuration command yet.

The existing CLI may remain:

```text
--help
--version
```

unless a small internal/non-mutating diagnostic surface is clearly necessary.

Prefer testing installer APIs directly.

The public `setup` command belongs to a later phase when there is an actual provider configuration to install.

---

# 10. Installer context

Filesystem operations must not implicitly derive all state from global process state.

Introduce a small explicit installer context.

Conceptually:

```ts
interface InstallerContext {
  homeDir: string;
  stateDir: string;
  allowedTargetRoots: readonly string[];
}
```

The exact shape may differ if implementation evidence supports a cleaner minimal representation.

The important requirements are:

- tests can inject temporary paths;
- installer state location is explicit;
- target write boundaries are explicit;
- real HOME is not required for core operation.

---

# 11. Production path resolution

Future production code may resolve:

```text
homeDir
stateDir
allowedTargetRoots
```

from the user's real environment.

That resolution belongs at the CLI/orchestration boundary.

Installer-core functions should consume already-resolved values.

This improves:

- testability;
- safety;
- provider neutrality;
- deterministic behavior.

---

# 12. Environment detection

Phase 2 should expose a small provider-neutral environment detector.

It may report:

```text
platform
architecture
Node version
runtime identity
home directory when explicitly requested by caller
```

Potential representation:

```ts
interface EnvironmentInfo {
  platform: NodeJS.Platform;
  architecture: string;
  runtime: {
    name: "node" | "bun";
    version: string;
  };
}
```

Do not over-model hardware or operating-system information without a current consumer.

---

# 13. Unsupported platform behavior

macOS is the primary v1 target.

However, Phase 2 unit/integration tests must remain runnable in CI.

Environment detection should distinguish:

```text
detected platform
```

from:

```text
supported production platform
```

Do not scatter:

```ts
if (process.platform !== "darwin") throw
...
```

through installer-core logic.

A future orchestration layer can enforce production support policy.

---

# 14. Desired artifact model

Phase 2 needs a provider-neutral description of what a higher layer wants installed.

Conceptually:

```ts
interface DesiredArtifact {
  id: string;
  targetPath: string;
  content: Uint8Array | string;
  ownership: "managed";
  mode?: number;
}
```

The exact representation may be refined.

Required properties:

- stable artifact identity;
- explicit target;
- desired content;
- ownership intent;
- optional file mode when required.

Do not include provider-specific metadata.

---

# 15. Stable artifact identity

Artifact identity must not depend solely on the absolute target path.

A future provider adapter should be able to supply identities such as:

```text
codex.global.instructions
codex.skill.plan
claude.global.instructions
```

while the installer itself treats them as opaque strings.

Phase 2 tests should use neutral IDs such as:

```text
fixture.alpha
fixture.beta
```

---

# 16. Supported artifact type in Phase 2

Phase 2 manages:

> **regular files**

Do not implement recursive directory ownership.

Directories may be created as containers required to place managed files, but directories themselves should not become
recursively managed artifacts.

Do not implement arbitrary recursive deletion.

This reduces the blast radius of installer bugs.

---

# 17. Symlink safety

Filesystem symlinks require conservative handling.

The installer must not blindly follow an existing symlink at a managed target and overwrite the symlink destination.

If a target path already exists as a symlink:

```text
conflict
```

unless a later explicit policy safely supports that case.

Similarly, path traversal must not escape approved target roots through intermediate symlinks.

Symlink behavior requires dedicated tests.

---

# 18. Path normalization

Every target path must be normalized before inspection or mutation.

Reject:

- malformed paths;
- relative paths where an absolute path is required;
- path traversal outside approved roots;
- paths whose resolved parent chain escapes an approved root;
- unsafe empty/root targets.

Never rely on string-prefix comparison alone for filesystem containment.

Use path-aware containment logic.

---

# 19. Allowed target roots

Installer writes are allowed only inside explicitly supplied target roots.

Examples in future phases may include provider configuration roots.

Phase 2 tests use temporary roots.

If a desired artifact targets a location outside every allowed root:

```text
INVALID_TARGET
```

and no mutation occurs.

This is a hard safety requirement.

---

# 20. Installer state root

The canonical future production state root is:

```text
~/.ai-config/
```

Phase 2 must make this location injectable.

Conceptually the state layout is:

```text
<stateDir>/
├── state.json
├── lock.json
├── receipts/
└── backups/
```

Additional temporary transaction files may exist when required by implementation.

Do not create:

```text
cache/
logs/
```

without a current Phase 2 consumer.

---

# 21. Machine-generated state format

Machine-generated installer state uses JSON.

Phase 2 defines the first real state schema.

Every persisted state document must contain a schema version.

For example:

```json
{
  "schemaVersion": 1
}
```

Do not build a migration framework yet.

Do design readers so an unknown future schema version fails clearly rather than being silently interpreted incorrectly.

---

# 22. Current state model

`state.json` should contain only the minimum durable information required to understand current managed ownership.

Conceptually:

```ts
interface InstallerState {
  schemaVersion: 1;
  artifacts: Record<string, InstalledArtifactState>;
}
```

Potential installed artifact metadata:

```ts
interface InstalledArtifactState {
  id: string;
  targetPath: string;
  ownership: "managed" | "adopted";
  contentHash: string;
  mode?: number;
  lastTransactionId: string;
}
```

The exact serialization may differ.

Do not store artifact contents inside `state.json`.

---

# 23. No secrets in state

Installer state and receipts must contain metadata, not sensitive content.

Avoid storing:

- credentials;
- API keys;
- tokens;
- full environment snapshots;
- arbitrary command output.

File contents belong either:

- at their target path;
- in transaction backup storage when necessary.

---

# 24. Content hashing

Use a stable cryptographic hash for installed content.

Recommended:

```text
SHA-256
```

Use Node's built-in cryptography implementation.

Do not add a dependency for hashing.

Hashes should represent exact file bytes.

Do not normalize:

- whitespace;
- line endings;
- encoding;

before hashing.

Drift should describe actual byte-level divergence.

---

# 25. Ownership states

The architecture recognizes:

```text
managed
adopted
unmanaged
```

---

# 26. Managed ownership

A managed artifact is fully owned by `ai-config`.

A file can be treated as managed only when installer state provides reliable ownership evidence for that
target/artifact.

A matching path alone does not prove ownership.

A matching desired filename does not prove ownership.

---

# 27. Unmanaged ownership

A file is unmanaged when it exists but the current installer state does not establish `ai-config` ownership.

Default behavior:

```text
existing unmanaged file
→ conflict
→ preserve
```

Never silently convert an unmanaged file to managed.

---

# 28. Adopted ownership

`adopted` represents partial ownership of an existing artifact.

The state model should reserve this ownership class because it is part of the approved architecture.

However:

> **Phase 2 must not implement generic adopted-content merging.**

Safe partial ownership depends on file type and provider-specific representation.

Examples include:

- managed text regions;
- structured JSON/YAML/TOML mutation;
- provider-specific imports.

Those strategies belong to later phases.

Phase 2 may persist/recognize `adopted` ownership metadata but must reject attempted generic adopted writes as
unsupported.

Do not invent a universal merge framework.

---

# 29. Current-file classification

For a desired managed artifact, inspection should distinguish at minimum:

```text
ABSENT
MANAGED_UNCHANGED
MANAGED_DRIFTED
UNMANAGED_EXISTING
SYMLINK_CONFLICT
INVALID_TARGET
```

Potential additional internal states may be used when justified.

These classifications are facts.

They are not yet actions.

---

# 30. Drift detection

A managed artifact is unchanged when:

```text
current file hash == recorded managed hash
```

It is drifted when:

```text
current file exists
AND ownership is managed
AND current file hash != recorded managed hash
```

A drifted managed artifact must not be automatically overwritten.

Default:

```text
MANAGED_DRIFTED
→ conflict
```

Future explicit conflict-resolution policies may override this.

Phase 2 does not implement force overwrite.

---

# 31. Missing managed artifact

If installer state says an artifact is managed but the target file is missing, classify it separately.

Recommended factual classification:

```text
MANAGED_MISSING
```

If the desired configuration still requires that artifact, the plan may propose recreating it.

The plan/report must make this visible rather than silently treating it as a brand-new install.

---

# 32. Desired-content equality

If a managed target exists, is unchanged from its recorded hash, and already equals desired content:

```text
NOOP
```

No backup.

No rewrite.

No receipt mutation solely to recreate identical state.

Idempotence requires this behavior.

---

# 33. Install plan

Planning and mutation must be separate.

Conceptually:

```text
inspect
    ↓
plan
    ↓
optional dry-run report
    ↓
apply exact approved/computed plan
```

The planner must not mutate the filesystem.

---

# 34. Plan representation

The install plan should be explicit data.

Conceptually:

```ts
interface InstallPlan {
  transactionId: string;
  actions: readonly InstallAction[];
  conflicts: readonly InstallConflict[];
  hasChanges: boolean;
  canApply: boolean;
}
```

Exact naming may differ.

Important:

- deterministic;
- inspectable;
- serializable if useful;
- independent from console formatting.

---

# 35. Plan action types

Phase 2 should support the smallest useful action set.

Recommended:

```text
CREATE
REPLACE_MANAGED
RECREATE_MISSING_MANAGED
NOOP
```

Potential removal support is addressed separately below.

Actions should explain:

- artifact ID;
- target;
- current classification;
- intended mutation;
- ownership;
- expected current hash when applicable;
- desired hash.

---

# 36. Conflicts

Recommended conflict categories:

```text
UNMANAGED_EXISTS
MANAGED_DRIFT
SYMLINK_TARGET
OUTSIDE_ALLOWED_ROOT
UNSUPPORTED_ARTIFACT
UNSUPPORTED_ADOPTED_WRITE
STATE_INCONSISTENCY
TRANSACTION_LOCKED
RECOVERY_REQUIRED
```

Exact internal names may differ.

Conflicts should be typed/data-driven rather than inferred from human strings.

---

# 37. No force flag in Phase 2

Do not implement:

```text
--force
```

or equivalent installer-core behavior.

Force overwrite is too broad and would weaken ownership guarantees.

Future conflict resolution should be explicit and narrow.

---

# 38. Dry-run contract

Dry-run is:

> **planning without mutation**

A dry run must not:

- create target files;
- modify target files;
- create backups;
- create installer state;
- create receipts;
- acquire persistent transaction lock;
- modify file modes.

Planning may read filesystem metadata/content required to classify state.

---

# 39. Dry-run result

A dry-run consumer should be able to display:

```text
create
replace managed
recreate missing managed
no change
conflict
```

plus reasons.

Formatting a polished CLI report is not required in Phase 2.

The core structured result is required.

---

# 40. Plan determinism

Given:

- identical desired artifacts;
- identical current filesystem;
- identical installer state;

the planner must produce semantically identical actions/conflicts.

Transaction IDs/timestamps may naturally differ.

Ordering must be stable.

Recommended stable ordering:

```text
artifact ID
```

or another explicitly deterministic key.

---

# 41. Stale-plan protection

The filesystem may change between planning and applying.

Therefore an apply operation must validate relevant preconditions again.

For a managed replacement, verify that:

```text
current hash at apply time == hash observed/planned
```

If not:

```text
abort
→ conflict
```

Do not blindly apply an old plan.

---

# 42. Transaction model

A mutation operation applies one install plan as one logical transaction.

Conceptually:

```text
validate plan
      ↓
acquire lock
      ↓
revalidate preconditions
      ↓
prepare transaction metadata
      ↓
backup existing files that will change
      ↓
apply changes
      ↓
verify resulting files
      ↓
persist current state
      ↓
finalize receipt
      ↓
release lock
```

On mutation failure:

```text
stop
→ rollback changes from current transaction
→ record failure where safe
→ release lock
```

---

# 43. Transaction identity

Each apply transaction receives a unique ID.

Recommended implementation:

```text
crypto.randomUUID()
```

No dependency required.

The transaction ID links:

- backups;
- receipt;
- current managed artifact metadata;
- diagnostics.

---

# 44. Transaction lock

Only one installer mutation transaction may operate on a state directory at a time.

Use an exclusive lock file under:

```text
<stateDir>/lock.json
```

Lock acquisition must be atomic.

Recommended primitive:

```text
open(..., "wx")
```

or equivalent exclusive creation.

---

# 45. Lock metadata

The lock should contain only useful diagnostic metadata, for example:

```json
{
  "schemaVersion": 1,
  "transactionId": "...",
  "pid": 12345,
  "createdAt": "..."
}
```

Do not create complex lease infrastructure.

---

# 46. Existing lock behavior

If a lock already exists:

```text
do not mutate
→ TRANSACTION_LOCKED
```

Phase 2 must not automatically delete an existing lock merely because it appears old.

A stale lock may represent an interrupted transaction.

Automatic stale-lock recovery is unsafe without additional evidence.

---

# 47. Incomplete transaction detection

Phase 2 must leave enough transaction evidence to detect that a previous mutation may have been interrupted.

On a new mutation attempt, if installer state indicates an unfinished transaction:

```text
RECOVERY_REQUIRED
```

and no new mutation begins.

Do not silently continue over uncertain state.

---

# 48. Crash recovery scope

Phase 2 must provide:

- same-process rollback after a handled apply failure;
- incomplete-transaction detection after process interruption.

Phase 2 does **not** need a complete user-facing crash-recovery CLI.

Automatic recovery after `kill -9`, machine crash, or power failure is not required unless it falls out naturally from a
small safe implementation.

Future `doctor` / recovery functionality can operate on Phase 2 transaction metadata.

---

# 49. Transaction receipt

Every completed mutation transaction should have a receipt.

Store under:

```text
<stateDir>/receipts/<transaction-id>.json
```

Receipt data should include enough evidence to answer:

```text
what was planned?
what changed?
what was backed up?
what hashes existed before?
what hashes exist after?
did the transaction commit or roll back?
```

---

# 50. Receipt status

Recommended transaction states:

```text
prepared
applying
committed
rolled_back
failed
```

The exact persisted progression should remain minimal.

Do not create a generic workflow-state machine.

---

# 51. Receipt contents

Conceptually:

```ts
interface TransactionReceipt {
  schemaVersion: 1;
  transactionId: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  actions: readonly ArtifactReceipt[];
}
```

Per-artifact receipt metadata may include:

```text
artifact ID
target path
action
ownership
before hash
after hash
backup reference
```

Do not store duplicate full file contents in JSON.

---

# 52. Backup contract

Before replacing any existing managed file, preserve its previous contents.

Store backup data under:

```text
<stateDir>/backups/<transaction-id>/
```

A newly created file requires no content backup.

The transaction must record that the file did not exist before mutation so rollback knows to remove it.

---

# 53. Backup path safety

Do not reproduce arbitrary absolute paths directly as filesystem paths underneath the backup root without sanitization.

Use a safe internal backup identity such as:

- artifact ID encoding;
- stable generated file name;
- hash-derived name;
- indexed entry.

The receipt maps the original target to the internal backup entry.

Prevent path traversal through backup metadata.

---

# 54. Backup fidelity

For existing regular files, preserve at minimum:

- bytes;
- file mode when relevant.

Do not attempt to preserve unrelated extended metadata in Phase 2 unless a concrete macOS requirement demonstrates
necessity.

Document any intentionally unsupported metadata.

---

# 55. Atomic file replacement

Where practical, replacing a regular file should:

1. write desired contents to a temporary file in the target directory;
2. apply intended mode;
3. atomically rename it over the target.

Do not write a managed replacement by truncating the existing target directly when a safer same-filesystem replacement
is available.

---

# 56. Temporary files

Transaction temporary files must:

- use collision-resistant names;
- remain within the relevant target directory when atomic rename depends on same-filesystem semantics;
- be removed after success;
- be removed best-effort after failure.

Do not leave predictable global temp filenames.

---

# 57. File modes

For newly created regular files:

```text
default mode: 0644
```

unless the desired artifact explicitly specifies another mode.

This is required for future executable artifacts such as launchers/scripts.

For replacements, desired explicit mode should win if supplied.

Otherwise preserve the existing managed file mode where practical.

The exact rule should be documented and tested.

---

# 58. Verification after write

A successful filesystem write is not sufficient evidence.

After applying each artifact, verify at minimum:

```text
target exists as expected
target is regular file
content hash == desired hash
mode matches intended mode where mode is managed
```

A mismatch triggers transaction failure and rollback.

---

# 59. Rollback contract

If any mutation inside the current transaction fails:

- stop applying subsequent actions;
- restore every already-modified existing artifact from its backup;
- remove files created by this transaction;
- restore relevant file modes;
- verify rollback where practical;
- record rolled-back/failed transaction state;
- do not update current managed state to the failed desired configuration.

---

# 60. Rollback failure

Rollback itself can fail.

If rollback cannot fully restore previous known state:

```text
FAILED_RECOVERY
```

or an equivalent explicit fatal result should be surfaced.

Do not report a clean rollback when recovery evidence is incomplete.

Preserve transaction metadata and backups for manual recovery.

---

# 61. Directory creation

The installer may create missing parent directories required for a managed file.

It must track directories created during the current transaction.

On rollback, it may remove those directories only when:

- they were created by the transaction;
- they are empty.

Never recursively delete directories during rollback.

---

# 62. Deletion/removal operations

Phase 2 should **not** implement general artifact removal unless required to complete a coherent safe state model.

Reason:

- deletion has greater destructive risk;
- no provider adapter yet produces obsolete artifacts;
- current Phase 2 use cases can be validated with create/replace/noop/conflict.

The data model may leave room for future:

```text
REMOVE_MANAGED
```

but do not implement speculative deletion logic without a current consumer.

Removal can be introduced during update/provider work with its own tests.

---

# 63. State persistence ordering

Current managed state must represent only committed configuration.

Therefore do not publish the new `state.json` before filesystem verification succeeds.

A recommended order is:

```text
backup
→ filesystem writes
→ post-write verification
→ write new state atomically
→ finalize receipt
```

Transaction metadata must still allow incomplete-operation detection.

---

# 64. Atomic state writes

`state.json` and receipt updates should use safe write patterns.

Prefer:

```text
write temporary state file
→ rename atomically
```

rather than truncating the canonical state file in place.

A corrupt installer-state file must fail clearly.

Do not silently reset corrupt state to empty.

---

# 65. First-run state

If:

```text
<stateDir>/state.json
```

does not exist, treat current managed state as empty.

Planning must not create the state directory.

The first successful apply transaction may create it.

---

# 66. Corrupt state

If state exists but:

- cannot be parsed;
- has invalid required structure;
- contains unsupported schema version;

the mutation operation must stop.

Recommended conflict/error:

```text
STATE_INVALID
```

Do not overwrite corrupt state with a new empty state.

Preservation takes precedence.

---

# 67. Unknown state schema

If:

```text
schemaVersion > supported schemaVersion
```

fail clearly.

Do not attempt best-effort interpretation.

Migration infrastructure belongs to later phases.

---

# 68. State consistency

State must not claim two different artifact IDs own the same full target path.

If such state is detected:

```text
STATE_INCONSISTENCY
```

and mutation stops.

Likewise, one artifact identity must not resolve ambiguously to multiple current targets without explicit future
migration semantics.

---

# 69. Duplicate desired targets

A desired artifact set must not contain multiple artifacts targeting the same file.

Planner validation must reject this before filesystem mutation.

Do not rely on input ordering to choose a winner.

---

# 70. Duplicate desired IDs

Desired artifact identities must be unique.

Duplicate IDs are invalid input.

Fail before inspection/mutation.

---

# 71. Empty desired set

An empty desired artifact collection is valid.

It should produce:

```text
hasChanges = false
canApply = true
```

and no filesystem mutation.

Do not create installer state merely because an empty plan was evaluated.

---

# 72. Idempotence

Phase 2 must prove installer-core idempotence.

After a successful apply:

```text
plan same desired state again
```

should produce only:

```text
NOOP
```

with:

```text
hasChanges = false
```

A second apply should not rewrite files or create meaningless backup transactions.

---

# 73. Conflict atomicity

If the computed plan contains any blocking conflict:

```text
canApply = false
```

Applying the plan must be rejected before mutation begins.

Do not partially apply the non-conflicting artifacts while skipping conflicts.

A later explicit feature may support partial application if ever justified.

Phase 2 uses all-or-nothing plan applicability.

---

# 74. Plan freshness

Plan actions should capture enough expected current state that apply can identify stale plans.

For example:

```text
expected absence
expected current hash
expected ownership
```

Before each mutation, revalidate.

If the target no longer matches the expectation:

```text
STALE_PLAN
```

and rollback/abort as appropriate.

---

# 75. Time representation

Persist timestamps in:

```text
ISO 8601 UTC
```

Example:

```text
2026-09-06T10:15:30.123Z
```

Do not persist locale-formatted timestamps.

---

# 76. Dependency policy

Prefer Node.js built-ins for Phase 2:

```text
node:fs
node:fs/promises
node:path
node:crypto
node:os
```

Do not add production dependencies unless they materially improve correctness or safety.

Any new production dependency requires explicit rationale in the completion report.

Zero production dependencies remains the preferred outcome.

---

# 77. Error model

Phase 2 requires structured errors/results for installer safety.

Do not create a large inheritance hierarchy.

Prefer a small discriminated-union or typed-result model.

Examples:

```ts
type InstallConflict =
  | { kind: "unmanaged-exists"; ... }
  | { kind: "managed-drift"; ... }
  | { kind: "invalid-target"; ... };
```

Exact design is implementation-level.

Important:

- callers can inspect error kind without parsing strings;
- user-facing messages remain separate from domain identity.

---

# 78. No exception swallowing

Filesystem errors must not be silently converted to:

```text
file missing
```

unless the specific error is actually equivalent to `ENOENT`.

Permission errors, invalid paths, I/O failures, and state corruption must remain distinguishable.

---

# 79. Core/module boundaries

Phase 2 may introduce modules approximately like:

```text
src/
├── core/
│   ├── artifacts.ts
│   ├── plan.ts
│   └── ...
├── installer/
│   ├── inspect.ts
│   ├── planner.ts
│   ├── apply.ts
│   ├── transaction.ts
│   ├── backup.ts
│   ├── paths.ts
│   └── ...
├── state/
│   ├── schema.ts
│   ├── read.ts
│   ├── write.ts
│   └── ...
└── validation/
```

This is illustrative.

Do not mechanically create every file.

Prefer cohesive modules matching actual responsibilities.

---

# 80. Core vs installer responsibility

`src/core` should contain provider-neutral domain contracts.

`src/installer` should contain filesystem mutation behavior.

`src/state` should contain persisted installer-state behavior.

Do not place all behavior in:

```text
utils.ts
helpers.ts
index.ts
```

merely for convenience.

---

# 81. No provider imports

Phase 2 installer/state/core modules must not import:

```text
src/providers/*
```

for provider-specific behavior.

Future providers will depend on installer contracts, not the reverse.

---

# 82. Test strategy

Phase 2 requires both:

```text
unit tests
integration tests
```

Integration tests are especially important because filesystem safety is the feature.

All integration tests use temporary roots.

---

# 83. Unit-test requirements

At minimum cover pure/domain behavior for:

- desired artifact validation;
- duplicate IDs;
- duplicate targets;
- hashing where useful;
- plan action classification;
- stable ordering;
- ownership classification;
- conflict classification;
- unknown schema rejection;
- path-containment logic.

Do not create unit tests solely to increase test count.

---

# 84. Integration-test requirements

At minimum cover:

### Fresh create

```text
absent target
→ CREATE
→ apply
→ correct content
→ state recorded
→ receipt recorded
```

### Idempotent second plan

```text
same desired state
→ NOOP
→ no rewrite
```

### Managed replacement

```text
managed unchanged old version
→ new desired content
→ REPLACE_MANAGED
→ backup
→ apply
→ state/hash updated
```

### Unmanaged collision

```text
existing unknown file
→ conflict
→ no mutation
```

### Managed drift

```text
managed state
→ user modifies file
→ MANAGED_DRIFT
→ conflict
→ preserve user content
```

### Missing managed artifact

```text
state says managed
target deleted
→ MANAGED_MISSING
→ explicit recreate plan
```

### Symlink target

```text
target symlink
→ conflict
→ linked destination untouched
```

### Outside allowed root

```text
target outside root
→ invalid
→ no mutation
```

### Stale plan

```text
plan
→ external change
→ apply
→ reject
```

### Failed write rollback

Inject controlled failure after at least one successful mutation.

Verify:

- prior modified file restored;
- newly created file removed;
- state not advanced;
- transaction reflects failure/rollback.

### Lock conflict

Existing lock:

```text
→ no mutation
→ structured locked result
```

### Corrupt state

Invalid `state.json`:

```text
→ stop
→ preserve state
→ no mutation
```

### Unknown schema

Unsupported future schema:

```text
→ stop
→ no mutation
```

---

# 85. Failure injection

Rollback tests require deterministic failure injection.

Do not depend on random OS failures.

Use a narrow test seam where required.

Examples:

- injectable filesystem operation abstraction;
- explicit test-only failure hook;
- small internal filesystem adapter.

Do not create a broad dependency-injection framework.

The seam should exist only where deterministic safety testing requires it.

---

# 86. Test HOME isolation

Every integration test that needs installer roots should create:

```text
temporaryHome
temporaryStateDir
temporaryAllowedRoot
```

Never use the current process HOME implicitly.

Tests should fail if code accidentally writes outside the temporary root.

---

# 87. Test cleanup

Temporary test directories must be removed after tests.

On a failed test, cleanup should still execute where practical.

No integration test should leave:

```text
.ai-config
backup
receipt
lock
fixture target
```

outside its isolated temporary directory.

---

# 88. Permission tests

Add targeted file-mode tests where portable and deterministic.

Do not make the entire test suite brittle across CI platforms due to platform-specific permission semantics.

macOS-specific behavior may be documented and later verified in macOS CI before public release.

---

# 89. CI

Existing Phase 1 CI must continue passing.

Do not expand CI excessively in Phase 2.

If installer behavior depends on POSIX filesystem semantics not represented by current Ubuntu CI, document the gap.

A macOS CI job may be added if its value is concrete and the cost/complexity remains reasonable.

Do not add a large platform matrix yet.

---

# 90. CLI behavior during Phase 2

Current:

```text
ai-config --help
ai-config --version
```

must remain functional.

No installer core work should regress the portable launcher.

Run existing launcher/integration tests unchanged unless a legitimate internal refactor requires adaptation.

---

# 91. Documentation required

Phase 2 should add concise technical documentation for the actual implemented installer contract.

Recommended:

```text
docs/architecture/installer-core.md
```

It should document implemented facts such as:

- artifact model;
- ownership semantics;
- dry-run;
- transaction lifecycle;
- state structure;
- receipts;
- backups;
- conflict policy;
- adopted ownership deferral.

Do not duplicate this entire plan.

Plans describe intended work.

Architecture docs describe the resulting durable system.

---

# 92. State schema documentation

If Phase 2 persists a real schema, document:

```text
schemaVersion
fields
invariants
forward-compatibility behavior
```

Do not document hypothetical future fields.

---

# 93. No migration framework yet

Phase 2 state starts at:

```text
schemaVersion: 1
```

Do not implement:

- migrations;
- schema registry;
- downgrade engine;
- version negotiation.

Unknown schema versions fail safely.

Migration behavior belongs to a later phase once a second schema actually exists.

---

# 94. No cache

Do not create a cache subsystem in Phase 2.

There is no remote source resolution yet.

---

# 95. No logs directory

Do not persist general logs in Phase 2.

Receipts provide durable transaction evidence.

Console/test diagnostics are sufficient.

Persistent logging may be reconsidered later.

---

# 96. No installer telemetry

Do not add:

- analytics;
- telemetry;
- crash reporting;
- remote diagnostics.

---

# 97. No network access

Phase 2 installer-core tests and behavior must not require network access.

All artifacts are supplied locally/in-memory.

---

# 98. Security considerations

Phase 2 is security-sensitive because it creates filesystem mutation primitives.

Review explicitly for:

- path traversal;
- symlink traversal;
- arbitrary path writes;
- unsafe recursive deletion;
- race conditions between plan/apply;
- stale-plan overwrite;
- state corruption;
- backup traversal;
- lock race;
- permissions;
- user-content overwrite;
- command execution.

The installer core should not need to execute arbitrary shell commands.

---

# 99. No arbitrary command execution

Desired artifacts are data.

They must not contain installer callbacks or shell commands that execute during application.

The installer writes files.

External package installation/process execution is a different future subsystem.

Do not mix them.

---

# 100. TOCTOU awareness

Perfect elimination of filesystem time-of-check/time-of-use races is not required in Phase 2.

However, obvious unsafe design must be avoided.

At minimum:

- revalidate planned target state before mutation;
- use exclusive lock for ai-config transactions;
- treat unexpected state changes as stale/conflict;
- use atomic replacement where practical.

Document residual limitations rather than claiming impossible transactional guarantees.

---

# 101. Transaction terminology

Do not claim true filesystem ACID transactions.

Use wording such as:

```text
logical transaction
transactional apply
best-effort rollback
atomic per-file replacement
```

where accurate.

The architecture should be precise about guarantees.

---

# 102. Manual rollback command

Do not expose:

```bash
ai-config rollback
```

in Phase 2.

But receipts/backups should be sufficient foundation for a later rollback command.

---

# 103. Backup retention

Do not implement backup garbage collection in Phase 2.

Successful transaction backups may remain.

Retention policy requires real usage evidence.

Avoid premature cleanup that could remove recovery evidence.

---

# 104. Receipt retention

Do not implement receipt pruning in Phase 2.

Receipts are small and valuable for debugging.

Retention can be addressed before public v1 if needed.

---

# 105. State ownership vs source version

Do not add `ai-config` release/version semantics into artifact state unless required by a current consumer.

The package is still at:

```text
0.0.0
```

State should focus on filesystem ownership and transaction evidence.

Release migration semantics come later.

---

# 106. Current source manifests

Do not expand example YAML manifests into a full schema just to feed Phase 2.

Tests should construct desired artifact inputs programmatically or through dedicated test fixtures.

The canonical manifest will be designed when a real provider/source consumer exists.

---

# 107. Completion report

After implementation, Codex must return:

## Status

Exactly one:

```text
COMPLETE — awaiting manual verification
BLOCKED — owner decision required
```

---

## Baseline inspected

Brief current repository/Git baseline.

---

## Files created

Exact paths.

---

## Files modified

Exact paths and reason.

---

## Production dependencies

List every production dependency and rationale.

Expected preferred result:

```text
None.
```

---

## Development dependencies

List additions/removals and purpose.

---

## Installer model

Summarize final:

- desired artifact model;
- ownership representation;
- state model;
- plan model;
- conflict model.

---

## Transaction design

Explain:

```text
lock
plan revalidation
backup
write
verification
state persistence
receipt
rollback
```

---

## Safety behavior

State actual behavior for:

- unmanaged existing file;
- managed drift;
- symlink target;
- outside-root target;
- corrupt state;
- stale plan;
- existing lock;
- failed transaction.

---

## Adopted ownership

Explicitly state what is represented and what remains deferred.

---

## Verification evidence

Exact command + PASS/FAIL.

---

## Test summary

List important integration scenarios and results.

---

## Known gaps

Anything intentionally not covered.

---

## Deviations from approved plan

If none:

```text
None.
```

---

## Open decisions before Phase 3

If none:

```text
None.
```

---

## Commit status

End with:

```text
No commit created. Awaiting explicit owner instruction.
```

---

# 108. Required automated verification

Before reporting complete, run all existing and new relevant checks.

At minimum:

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
launcher tests
```

No required automated test may fail.

---

# 109. Installer-specific verification

Provide evidence for:

```text
fresh create
idempotent re-plan
managed replacement
backup creation
unmanaged conflict
drift conflict
missing managed artifact
symlink conflict
outside-root rejection
stale-plan rejection
lock conflict
corrupt-state rejection
unknown-schema rejection
failed-transaction rollback
current-state persistence
receipt creation
```

If an item cannot reasonably be automated, explain why.

---

# 110. Self-review

Before completion:

1. inspect complete diff;
2. compare with Master Architecture;
3. compare with this approved plan;
4. inspect path safety;
5. inspect symlink handling;
6. inspect ownership logic;
7. inspect rollback paths;
8. inspect state-write ordering;
9. inspect state corruption handling;
10. inspect test isolation;
11. inspect production dependencies;
12. inspect unnecessary abstraction;
13. inspect unused code;
14. inspect public docs for false claims.

Delete unnecessary complexity.

---

# 111. Security self-review

Perform a focused read-only security pass over the installer core.

Specifically attempt to identify:

```text
path traversal
symlink escape
unmanaged overwrite
drift overwrite
recursive-delete risk
stale-plan overwrite
backup path escape
lock race
state corruption overwrite
command injection
```

Fix clear Phase 2 implementation defects.

Do not expand into a general repository security project.

---

# 112. Manual verification required

After automated verification, the owner should review:

- installer architecture document;
- state JSON examples from tests if useful;
- a fresh-create plan;
- unmanaged-file conflict result;
- drift conflict result;
- transaction receipt;
- backup directory structure;
- rollback test evidence;
- repository dependency changes;
- overall module complexity.

Codex must provide exact files/commands for this review.

---

# 113. Definition of Done

Phase 2 is complete only when all applicable statements are true:

- installer core is provider-neutral;
- real provider configuration is untouched;
- real user HOME is untouched by tests;
- desired artifacts can be represented;
- target paths are constrained to allowed roots;
- unsafe path traversal is rejected;
- existing symlink targets are not followed for mutation;
- content hashing exists;
- managed ownership is represented;
- unmanaged existing content is preserved;
- adopted ownership is represented but generic merging is deferred;
- drift is detected;
- missing managed artifacts are distinguished;
- deterministic planning exists;
- dry-run performs no mutation;
- conflict-containing plans cannot partially apply;
- stale plans are rejected;
- installer mutation is transaction-locked;
- backups are created before managed replacement;
- regular-file replacement is safely implemented;
- successful writes are verified;
- successful state is persisted only after filesystem verification;
- receipts are persisted;
- current-transaction failure triggers rollback;
- created files are removed during rollback;
- replaced files are restored during rollback;
- incomplete transaction state can be detected;
- corrupt state blocks mutation;
- unknown state schema blocks mutation;
- state writes are safe/atomic where practical;
- state schema version is explicit;
- no general recursive deletion exists;
- no force overwrite exists;
- no production provider setup command exists;
- no external packages/skills are installed;
- no network access is required;
- existing CLI still works;
- existing launcher still works;
- automated checks pass;
- installer safety integration tests pass;
- no unnecessary production dependencies were introduced;
- manual review passes;
- no material open decision blocks Phase 3.

---

# 114. Proposed Phase 2 decisions

Approval of this plan approves the following decisions for Phase 2.

## D2-1 — Artifact scope

Phase 2 manages regular files only.

No recursive directory ownership.

---

## D2-2 — Ownership

The installer recognizes:

```text
managed
adopted
unmanaged
```

but only full-file `managed` mutation is implemented in Phase 2.

Generic adopted merging is deferred.

---

## D2-3 — Unknown existing files

Unknown existing files are preserved and reported as conflicts.

No implicit adoption.

---

## D2-4 — Drift

Locally modified managed files block replacement.

No force overwrite.

---

## D2-5 — Hash

Managed content uses SHA-256 exact-byte hashes.

---

## D2-6 — State

Installer state uses JSON with:

```text
schemaVersion: 1
```

---

## D2-7 — State root

Production state root remains conceptually:

```text
~/.ai-config
```

but is injectable in all Phase 2 core behavior.

---

## D2-8 — Lock

Mutation uses one exclusive lock per installer state root.

An existing lock blocks mutation.

No automatic stale-lock deletion.

---

## D2-9 — Backup

Every existing managed file that will be changed is backed up before mutation.

---

## D2-10 — Rollback

Phase 2 implements same-process rollback for failed apply transactions.

Full user-facing crash recovery is deferred.

---

## D2-11 — Interrupted transactions

Possible interrupted transactions are detected and block new mutation until recovery is resolved.

---

## D2-12 — Deletion

General managed-artifact deletion is deferred.

Phase 2 focuses on:

```text
create
replace managed
recreate missing managed
noop
conflict
```

---

## D2-13 — Dry-run

Dry-run is pure planning/inspection.

It creates no persistent installer state.

---

## D2-14 — Plan application

Any blocking conflict makes the entire plan non-applicable.

No partial apply.

---

## D2-15 — Path security

All writes require explicit allowed target roots.

Symlink/path escapes are rejected.

---

## D2-16 — Dependencies

Prefer zero new production dependencies.

Node built-ins should be sufficient.

---

## D2-17 — CLI

Phase 2 does not expose real:

```text
setup
update
doctor
status
rollback
```

commands.

---

# 115. Decisions intentionally deferred

The following are not Phase 2 decisions:

- Codex target paths;
- Claude target paths;
- provider home environment variables;
- full provider capabilities;
- adopted text-marker format;
- adopted JSON/YAML structural merge;
- managed artifact deletion;
- update semantics for obsolete provider assets;
- public rollback CLI;
- automatic crash recovery;
- backup retention;
- receipt retention;
- state migration framework;
- canonical manifest schema;
- source registry schema;
- external package installation;
- skill installation;
- `setup` CLI UX;
- `doctor` UX;
- conflict-resolution UI;
- force-replacement workflow;
- provider-specific permissions;
- npm package release.

Do not invent them during implementation.

---

# 116. Open decisions before implementation

No separate owner decision is required if this plan is approved as written.

Approval of this document approves the proposed Phase 2 decisions in section 114.

If the owner disagrees with any proposed decision, that item must be changed before implementation begins.

---

# 117. Implementation sequence

Codex should execute the approved Phase 2 in this order.

## Step 1 — inspect baseline

Read completely:

```text
docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md
docs/plans/PHASE-1-REPOSITORY-FOUNDATION.md
docs/plans/PHASE-2-INSTALLER-CORE.md
```

Inspect:

```text
repository tree
package.json
existing source
existing tests
Git status
```

---

## Step 2 — validate plan against actual repository

Confirm that the current Phase 1 implementation supports the proposed installer boundaries.

If a material conflict exists, report before redesigning.

---

## Step 3 — define minimal domain contracts

Establish:

- desired artifact;
- installed artifact state;
- ownership;
- file classification;
- plan action;
- conflict;
- install plan;
- transaction/receipt metadata.

Avoid speculative future fields.

---

## Step 4 — implement path safety and inspection

Implement:

- path normalization;
- allowed-root validation;
- symlink-safe inspection;
- regular-file classification;
- hashing.

Write safety tests early.

---

## Step 5 — implement state read/write

Implement:

- schema v1;
- missing state;
- corrupt state;
- unsupported schema;
- atomic safe write.

No migration framework.

---

## Step 6 — implement planner

Implement deterministic provider-neutral plan generation.

No filesystem mutation.

Cover:

```text
create
managed unchanged/noop
managed replacement
managed drift
managed missing
unmanaged collision
unsafe targets
```

---

## Step 7 — implement dry-run semantics

Confirm planner can be used without creating installer state or modifying target filesystem.

---

## Step 8 — implement transaction lock

Add exclusive mutation locking and tests.

---

## Step 9 — implement backup primitives

Create transaction-scoped backups with safe internal paths.

---

## Step 10 — implement transactional apply

Implement:

```text
revalidation
backup
create/replace
post-write verification
state persistence
receipt finalization
```

---

## Step 11 — implement rollback

Add deterministic failure injection and prove rollback.

Do not build a general DI framework.

---

## Step 12 — implement incomplete transaction detection

Ensure uncertain/interrupted transaction evidence blocks subsequent mutation.

---

## Step 13 — integration tests

Build the full safety matrix required by this plan.

---

## Step 14 — documentation

Create/update durable installer-core architecture documentation based on what was actually implemented.

---

## Step 15 — full verification

Run all required checks.

---

## Step 16 — security self-review

Review filesystem mutation paths specifically.

---

## Step 17 — remove overengineering

Delete:

- unused abstraction;
- future-only code;
- unnecessary dependencies;
- duplicate models;
- fake extensibility.

---

## Step 18 — completion report

Return the required report.

---

## Step 19 — STOP

Do not:

- commit;
- start Phase 3;
- implement Codex adapter;
- implement Claude adapter;
- configure real HOME;
- install skills;
- add external sources;
- publish.

Wait for owner manual QA and external review.

---

# 118. Phase invariant

The governing constraint for Phase 2 is:

> **The installer must know how to change files safely before it knows which provider files to change.**

Provider behavior comes later.

Safety comes first.
