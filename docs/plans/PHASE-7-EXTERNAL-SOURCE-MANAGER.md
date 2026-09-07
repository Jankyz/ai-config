# AI Config — Phase 7: External Source Manager

**Status:** approved for implementation
**Approved:** 2026-09-06
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-6-CLAUDE-ADAPTER.md`  
**Phase:** 7 of 10  
**Primary target:** macOS  
**Implementation authority:** no implementation before explicit owner approval  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Implement a provider-neutral external source manager that can reproducibly acquire, verify, pin, inspect, and compare
third-party resources without silently changing the installed AI workflow.

Phase 7 establishes:

- canonical external-source registry;
- immutable source lock;
- GitHub repository/path acquisition;
- npm package metadata resolution;
- integrity verification;
- provenance and license metadata;
- disposable source cache;
- deterministic upstream diffs;
- explicit resource ownership modes;
- safe update workflow.

Phase 7 does **not** introduce external skills into the active workflow.

---

## 2. Core invariant

> External upstream changes never change ai-config behavior until a reviewed ai-config repository change accepts them.

Normal setup must never install from:

```text
main
master
HEAD
latest
```

as a moving target.

Runtime installation uses only locked immutable source identities.

---

## 3. Source vs resource

Keep two concepts separate.

### Source

An upstream location, for example:

```text
mattpocock/skills
Yeachan-Heo/oh-my-codex
an npm package
```

### Resource

A specific thing inside a source, for example:

```text
one skill directory
one script/tool
one package
one future plugin
```

`ai-config` manages resources, not entire repositories by implication.

Registering a source must not automatically install everything it contains.

---

## 4. Canonical files

Create:

```text
upstream/
├── README.md
├── registry.json
└── lock.json
```

### `registry.json`

Human-reviewed intent:

- source identity;
- source kind;
- upstream location;
- tracking reference where useful;
- resource declarations;
- expected license policy;
- ownership/distribution mode.

### `lock.json`

Machine-generated immutable resolution:

- exact Git commit;
- exact npm version;
- npm integrity when applicable;
- resource tree/content digest;
- resolved license evidence;
- resolution timestamp.

Both files are source-controlled.

---

## 5. Why JSON

Use JSON for the Phase 7 runtime registry and lock.

Reason:

- Node can parse it without a new runtime dependency;
- deterministic validation is simple;
- lock files are naturally machine-readable;
- avoiding a YAML parser keeps production dependencies minimal.

Do not introduce a general configuration framework.

---

## 6. Initial source kinds

Phase 7 supports two source kinds:

```text
github
npm
```

### GitHub

Used for repository resources such as skills.

### npm

Used to resolve exact package metadata and integrity.

Phase 7 does not yet globally install npm packages.

Actual host-package installation is introduced only when a real declared consumer requires it.

---

## 7. GitHub source model

Conceptually:

```json
{
  "id": "matt-skills",
  "kind": "github",
  "repository": "mattpocock/skills",
  "track": {
    "type": "branch",
    "value": "main"
  }
}
```

`track` is used only to discover update candidates.

Installation never consumes `track` directly.

The lock resolves it to an exact commit SHA.

---

## 8. GitHub acquisition

Acquire GitHub resources through HTTPS using Node APIs.

Do not invoke:

```text
git clone
git checkout
curl | sh
upstream installer commands
```

for normal source acquisition.

The acquisition layer must be injectable/testable and must support:

- bounded timeout;
- response-size limits;
- path validation;
- file-count limits;
- deterministic file ordering.

Do not execute downloaded content.

---

## 9. GitHub resource identity

A GitHub resource is identified by:

```text
source ID
exact locked commit
repository-relative resource path
```

The manager must reject:

- path traversal;
- absolute repository paths;
- submodule traversal;
- resource paths outside the declared repository tree.

Symlinks inside acquired resources are unsupported by default and must be reported rather than followed.

---

## 10. Resource digest

Every acquired directory resource receives a deterministic tree digest.

Digest input should include the sorted set of:

```text
relative path
file bytes hash
relevant file type/mode identity
```

Use SHA-256.

The same resource bytes at the same paths must produce the same digest.

The lock records the expected digest.

---

## 11. npm source model

Phase 7 supports read-only resolution of an exact npm package version.

Conceptually:

```json
{
  "id": "example-cli",
  "kind": "npm",
  "package": "@scope/package",
  "version": "1.2.3"
}
```

Require an exact version in v1.

Do not accept:

```text
latest
*
^1.2.3
~1.2.3
```

as an install lock.

Resolve and record registry integrity metadata such as `dist.integrity` when available.

---

## 12. npm execution boundary

Phase 7 must not:

- install npm packages globally;
- execute package lifecycle scripts;
- unpack and execute arbitrary package code;
- run package binaries.

It only establishes reproducible package-source metadata.

Phase 8 or later may consume this capability when a real supporting package is approved.

---

## 13. Resource modes

Every external resource uses one explicit mode:

```text
reference
external-managed
vendored
adapted
```

### `reference`

Tracked and pinned for research/update comparison only.

Not installed or distributed.

### `external-managed`

Exact locked upstream bytes are fetched and verified when required by installation.

`ai-config` does not maintain a modified local copy.

### `vendored`

Exact upstream bytes are copied into the repository/package unchanged.

Updates replace them only after explicit review.

### `adapted`

Derived from upstream but semantically modified by `ai-config`.

The local adapted artifact becomes ai-config-owned.

Upstream changes never overwrite it automatically.

---

## 14. Adapted-resource rule

An adapted resource must record:

```text
source ID
upstream resource path
base locked revision
upstream license
local canonical path
adaptation status
```

Once adapted:

> local ai-config semantics are authoritative.

An upstream update produces review information only.

It must never automatically rewrite the adapted local artifact.

---

## 15. Vendored-resource rule

Vendored content must remain byte-identical to the locked upstream resource unless its mode is changed to `adapted`.

If local content differs:

```text
vendor integrity failure
```

Do not silently treat modifications as upstream content.

---

## 16. External-managed rule

At installation time an external-managed resource must satisfy:

```text
locked immutable source
+
downloaded bytes
+
expected resource digest
+
known license
```

before it may be handed to a provider representation/installer.

Digest mismatch blocks installation.

Never fall back to a newer upstream version.

---

## 17. License model

Each resource must have explicit license evidence.

Support:

```text
repository-level license
resource-level license
```

Do not assume the repository root license always applies to every resource.

Registry/lock metadata should record:

```text
SPDX identifier when known
evidence path/source
license scope
```

Unknown or incompatible license means:

```text
DO NOT DISTRIBUTE
```

until reviewed.

---

## 18. Third-party notices

Generate/update:

```text
THIRD_PARTY_NOTICES.md
```

only for resources that `ai-config` actually distributes or installs as external dependencies.

Reference-only sources do not require distribution notices.

Notices must identify:

- resource;
- upstream owner/project;
- source;
- license;
- whether content is vendored or adapted.

Do not copy irrelevant dependency license trees.

---

## 19. Initial upstream registrations

Phase 7 registers these as **reference-only sources**:

```text
mattpocock/skills
Yeachan-Heo/oh-my-codex
```

At implementation time resolve each to an exact current commit and record the current applicable license evidence.

Do not import or install any skill from either repository in Phase 7.

The registration exists to:

- dogfood source resolution;
- establish provenance;
- make Phase 8 resource selection reproducible.

---

## 20. Why Matt/OMX remain reference-only

Phase 4 already defines the core ai-config workflow.

Importing external workflow skills in Phase 7 would blur ownership and reintroduce overlapping behavior.

External skills become active only when a later approved phase identifies a specific capability gap.

Phase 8 may select individual UI/product resources.

Do not install whole Matt or OMX repositories.

---

## 21. Do not invoke upstream installers

Phase 7 must not use provider/upstream installation commands such as:

```text
npx skills@latest add ...
claude plugins install ...
npm install -g oh-my-codex
```

to materialize ai-config dependencies.

Those commands have their own mutable/update semantics.

`ai-config` resolves immutable source artifacts itself.

---

## 22. Cache

Disposable downloaded data may live under:

```text
~/.ai-config/cache/upstream/
```

Production paths must remain injectable for tests.

Cache is never authoritative.

Every cached resource must be revalidated against its lock digest before use.

Deleting the entire cache must not alter desired configuration.

---

## 23. No secrets in source state

Do not persist:

- GitHub tokens;
- npm tokens;
- authorization headers;
- credentials.

Optional runtime credentials may later be read from provider-standard environment/configuration, but Phase 7 must not
take ownership of them.

Public sources must work without stored ai-config secrets where upstream limits permit.

---

## 24. Update workflow

External updates are deliberate.

Conceptually:

```text
read registry
    ↓
read current lock
    ↓
resolve tracking reference
    ↓
candidate immutable revision
    ↓
fetch candidate resource
    ↓
license + integrity validation
    ↓
diff against locked resource
    ↓
human review
    ↓
update lock / vendor / adaptation
    ↓
tests
    ↓
new ai-config commit/release
```

No background or automatic upstream updates.

---

## 25. Update check vs update

Keep these distinct.

### Check

Read-only.

Reports whether a tracked source has a newer candidate.

### Update

Repository mutation.

Changes the lock/vendor/provenance only after explicit owner authorization.

Phase 7 may implement internal APIs for both.

Do not expose a broad public update CLI yet.

---

## 26. Diff model

Provide a deterministic resource diff showing at minimum:

```text
added files
removed files
changed files
old digest
new digest
old revision
new revision
license change
```

For small UTF-8 text resources, a bounded textual diff may be included where useful.

Do not attempt semantic AI-generated merging inside the source manager.

Adapted-resource merging is a review task.

---

## 27. Provenance

Every resolved resource must be able to answer:

```text
where did this come from?
which exact revision/version?
which path?
which digest?
which license?
when was it resolved?
how is ai-config using it?
```

Provenance is part of correctness, not optional documentation.

---

## 28. Source validation

Registry validation must reject:

- duplicate source IDs;
- duplicate resource IDs;
- unsupported source kinds;
- mutable npm versions;
- invalid GitHub repository identifiers;
- absolute/traversal resource paths;
- unsupported resource modes;
- missing license policy;
- adapted resources without local path;
- external-managed resources without an installable resource declaration.

Keep validation explicit and small.

---

## 29. Network safety

Remote acquisition must use:

- HTTPS only;
- bounded timeout;
- maximum response size;
- maximum resource file count;
- maximum individual file size;
- maximum total resource size.

Limits should be conservative but practical and centrally configurable.

Do not follow arbitrary redirects to unsupported hosts without validation.

---

## 30. Source filesystem safety

Materializing a resource into cache or a temporary directory must:

- validate every relative path;
- reject `..`;
- reject absolute paths;
- reject symlink escape;
- never write outside the explicit cache/temp root;
- use safe file creation.

Reuse Phase 2 filesystem primitives where appropriate without coupling source acquisition to provider ownership state.

---

## 31. No execution during acquisition

Source acquisition, validation, diffing and caching are data operations.

Never execute:

- downloaded scripts;
- package binaries;
- lifecycle scripts;
- hooks;
- plugin code.

A future approved consumer may explicitly execute an installed dependency.

That is outside Phase 7 source acquisition.

---

## 32. Runtime architecture

Recommended implementation area:

```text
src/sources/
├── index.ts
├── registry.ts
├── lock.ts
├── github.ts
├── npm.ts
├── integrity.ts
├── cache.ts
└── diff.ts
```

This is illustrative.

Do not mechanically create every file.

Prefer cohesive modules matching actual responsibilities.

---

## 33. Package assets

Package runtime source metadata required by future setup:

```text
upstream/registry.json
upstream/lock.json
```

and required source-manager runtime code.

Do not package:

- source-manager tests;
- update-review temporary downloads;
- caches;
- planning documents.

---

## 34. No public source CLI yet

Phase 7 does not need to expose:

```text
ai-config source add
ai-config source update
ai-config dependency install
```

The manager is implemented as internal runtime capability first.

Phase 8 consumes it.

Public orchestration can be designed after dogfooding.

---

## 35. Tests

Use injected network clients and temporary cache roots.

No test should depend on current GitHub/npm availability unless explicitly marked as optional external verification.

Required scenarios:

### Registry

```text
valid registry
invalid source/resource IDs
mutable npm version rejected
path traversal rejected
mode-specific validation
```

### GitHub

```text
exact commit resolution
resource directory retrieval
deterministic tree digest
symlink/submodule rejection
size/file-count limits
digest mismatch
```

### npm

```text
exact version metadata
integrity captured
mutable version rejected
missing package/version
```

### Cache

```text
cache hit with matching digest
corrupt cache rejected/refetched
cache deletion harmless
no path escape
```

### Diff

```text
added
removed
changed
unchanged
license change
```

### Provenance

Every resolved fixture resource has complete provenance.

---

## 36. Real-upstream verification

In addition to deterministic mocked tests, implementation should perform a read-only live verification against:

```text
mattpocock/skills
Yeachan-Heo/oh-my-codex
```

to resolve the approved reference-only lock entries.

Do not run their installers or code.

If GitHub/network access is unavailable:

```text
BLOCKED — owner decision required
```

for finalizing those lock entries.

Do not invent commit SHAs or licenses.

---

## 37. Documentation

Create:

```text
docs/architecture/external-sources.md
```

Keep it concise.

Document:

- registry vs lock;
- source vs resource;
- four resource modes;
- immutable pinning;
- license/provenance;
- cache;
- update workflow;
- no-execution rule.

Update `upstream/README.md` accordingly.

---

## 38. Explicitly outside Phase 7

Do not:

- activate Matt skills;
- activate OMX skills;
- install full upstream repositories;
- install npm packages globally;
- execute external scripts;
- add UI skills;
- implement plugin marketplaces;
- modify current provider workflow;
- auto-update dependencies;
- migrate the real workstation.

---

## 39. Definition of Done

Phase 7 is complete when:

- registry and immutable lock exist;
- Matt and OMX are registered reference-only;
- their real current immutable revisions and license evidence are locked;
- GitHub directory resources can be acquired safely;
- npm exact-version metadata can be resolved safely;
- resource digests are deterministic;
- cache is disposable and integrity-checked;
- provenance is complete;
- licensing supports repo- and resource-level evidence;
- resource modes are represented;
- update candidate checks are read-only;
- source updates require explicit repository mutation;
- no external content is executed;
- no external workflow is activated;
- no production credentials are stored;
- all existing Phase 1–6 tests remain green;
- no unnecessary production dependency is added;
- owner manual QA passes.

---

## 40. Approved decisions

Approval of this plan approves:

1. registry and lock use JSON;
2. lock is source-controlled;
3. normal installs use immutable locked identities only;
4. Phase 7 supports GitHub and npm source kinds;
5. npm support is metadata/integrity only, not global install;
6. external resource modes are `reference`, `external-managed`, `vendored`, `adapted`;
7. adapted resources are locally authoritative;
8. GitHub acquisition does not invoke Git or upstream installers;
9. source acquisition never executes downloaded content;
10. cache is disposable and non-authoritative;
11. Matt Pocock Skills and OMX are registered reference-only;
12. no external skill becomes active in Phase 7;
13. no public source-manager CLI yet.

---

## 41. Implementation sequence

1. Inspect Master Architecture and existing `src/sources`/upstream placeholders.
2. Reconfirm current Matt/OMX repositories and licensing from primary sources.
3. Define compact registry/lock schemas and validation.
4. Implement immutable GitHub resolution/acquisition.
5. Implement exact npm metadata/integrity resolution.
6. Implement deterministic digest/provenance/cache.
7. Implement candidate diff/update-check behavior.
8. Register Matt and OMX as reference-only and resolve real lock entries.
9. Add deterministic tests and live read-only upstream verification.
10. Add concise architecture/upstream documentation.
11. Run full repository verification and package inspection.
12. Perform focused supply-chain/security self-review.
13. Report results.
14. STOP — no commit, no Phase 8, no external activation.

---

## 42. Completion report

Return:

### Status

`COMPLETE — awaiting manual verification`

or:

`BLOCKED — owner decision required`

### Files created / modified

Grouped concise list.

### Registry / lock

Report schema versions and locked source identities.

### Initial sources

For Matt and OMX report:

```text
source ID
repository
exact locked commit
license + evidence
mode = reference
```

### GitHub acquisition

Explain immutable resolution, resource retrieval and limits.

### npm resolution

Explain exact-version and integrity behavior.

### Integrity / cache

Explain tree digest and cache validation.

### Resource modes

Confirm behavior for all four modes.

### Update model

Explain check vs update.

### Verification

Exact commands + PASS/FAIL and test counts.

### Supply-chain review

Confirm:

- no arbitrary execution;
- no mutable install identities;
- no path traversal;
- no stored secrets;
- no external workflow activation.

### Package contents

Report new runtime assets and unexpected files, if any.

### Known gaps

If none:

`None.`

### Deviations

If none:

`None.`

### Open decisions before Phase 8

If none:

`None.`

### Commit

End exactly:

`No commit created. Awaiting explicit owner instruction.`

---

## Phase invariant

> **ai-config may observe upstream change automatically; it may never adopt upstream change automatically.**
