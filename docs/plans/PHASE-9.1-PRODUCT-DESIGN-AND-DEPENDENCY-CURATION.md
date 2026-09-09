# AI Config — Phase 9.1: Product Design and Dependency Curation

**Status:** approved for implementation
**Approved:** 2026-09-07
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-9-MIGRATION-AND-DOGFOODING.md`  
**Next phase:** Phase 10 — Public Release  
**Primary target:** macOS + Codex  
**Claude:** supported through the existing provider adapter where applicable  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Complete the original ai-config product promise before public release:

> A clean Mac should be able to reconstruct the owner's curated AI coding environment from ai-config, including native
> skills, adapted skills, selected external skills, required managed tools, provenance, versions, and provider
> installation.

Phase 9.1 must:

1. preserve and adapt the owner's existing `product-design-lead`;
2. make it canonical as `aic-product-design-lead`;
3. preserve its complementary design-evidence workflow;
4. curate useful external skills instead of rewriting good upstream capabilities;
5. install approved external skills through ai-config;
6. manage required global tool dependencies where appropriate;
7. establish controlled dependency-update semantics;
8. remove obsolete OMX/legacy global configuration only after replacements are verified.

---

## 2. Target environment model

The intended environment after Phase 9.1 is:

```text
ai-config-owned
├── compact global AGENTS.md
├── native aic-* skills
├── aic-product-design-lead
├── adapted skills
│   ├── aic-ui-components
│   └── aic-ui-generate
├── selected external-managed skills
│   ├── curated Matt Pocock skills
│   ├── UI UX Pro Max
│   └── official shadcn skill
├── managed global tools where required
│   └── 21st CLI
└── ai-config state / provenance / version locks

external capabilities used when available
├── OpenAI Product Design
├── Browser
├── Playwright / equivalent rendered-state tooling
└── project-local tools

removed legacy
├── OMX orchestration
├── OMX runtime/state
├── team/swarm/Ralph/pipeline workflows
├── keyword routing
└── obsolete duplicated global skills
```

Do not delete anything from the real environment until the replacement environment is complete and separately approved.

---

## 3. Dependency classes

Phase 9.1 formalizes these classes:

```text
NATIVE
ADAPTED
EXTERNAL_MANAGED
MANAGED_TOOL
EXTERNAL_CAPABILITY
REFERENCE
REMOVE
```

### NATIVE

Owned and maintained by ai-config.

Example:

```text
aic-product-design-lead
```

### ADAPTED

Based on a pinned upstream resource but with ai-config semantics authoritative.

Existing examples:

```text
aic-ui-components
aic-ui-generate
```

### EXTERNAL_MANAGED

Upstream content is installed unchanged from an immutable ai-config lock.

ai-config owns:

- version selection;
- provenance;
- integrity;
- installation;
- update/removal lifecycle.

ai-config does not maintain a fork.

### MANAGED_TOOL

An executable/runtime dependency required by canonical ai-config capabilities.

ai-config owns the selected version and installation location.

### EXTERNAL_CAPABILITY

A useful product/plugin/browser/service capability which ai-config may instruct agents to use but cannot safely or
portably distribute itself.

### REFERENCE

Tracked for research/update comparison only.

### REMOVE

Legacy functionality deliberately excluded from the final environment.

---

# PART A — Preserve `product-design-lead`

## 4. Extract the real current skill first

Before modifying or cleaning the real global environment, locate the actual currently installed:

```text
product-design-lead
```

Read-only.

Capture its complete logical resource:

```text
SKILL.md
references/
assets/
scripts/
supporting files
```

where present.

Do not reconstruct it from conversation history.

The current installed skill is the authoritative migration source.

Do not delete or modify it during extraction.

---

## 5. Dependency audit

Inspect the extracted skill for dependencies on:

```text
OMX
OMX state/runtime
other legacy skills
absolute local paths
personal configuration
provider-specific assumptions
external design tools
MCP integrations
Browser / Playwright
21st
UI UX Pro Max
shadcn
OpenAI Product Design
```

Classify every dependency:

```text
KEEP
REPLACE WITH AIC
EXTERNAL_MANAGED
MANAGED_TOOL
EXTERNAL_CAPABILITY
REMOVE
UNKNOWN
```

An `UNKNOWN` dependency must not be silently deleted.

---

## 6. Create `aic-product-design-lead`

Adapt the real skill into:

```text
skills/aic-product-design-lead/
```

Canonical name:

```text
aic-product-design-lead
```

Preserve the skill's product/design reasoning, process quality, and useful domain knowledge.

Remove only dependencies that conflict with the ai-config architecture, such as:

- OMX runtime/state;
- automatic OMX orchestration;
- team/swarm/Ralph assumptions;
- keyword routing;
- obsolete local skill names;
- personal absolute paths;
- provider-specific global filesystem assumptions.

Do not simplify the skill merely to make it shorter.

The adapted skill should retain the value of the original.

---

## 7. Complementary design evidence is mandatory

The following behavior is a core feature of `aic-product-design-lead` and MUST survive adaptation.

For substantial work:

1. inspect the actual application and source first;
2. use OpenAI Product Design for product-level reasoning, flows, IA, audits, redesign discovery and visual ideation
   where useful;
3. use UI UX Pro Max for heuristics, accessibility, typography, palette, spacing, layout and design-system evidence;
4. use `aic-ui-components` / 21st to search designer-created components and patterns before inventing major patterns;
5. consult shadcn primitives and official shadcn knowledge when relevant;
6. inspect rendered results and interaction states through Browser, Playwright, or equivalent available tooling.

These tools are complementary evidence sources.

No individual tool is the sole source of truth.

The skill must synthesize evidence against:

```text
actual product
users
brand
codebase
DESIGN.md
architecture
technology stack
```

Consulting a tool must never by itself justify adding:

```text
React
Tailwind
shadcn
new UI libraries
new runtime dependencies
```

---

## 8. Focused tool workflows

`aic-product-design-lead` must preserve the existing principle that specialized tools should be used through their
focused workflows.

In particular:

### OpenAI Product Design

Use focused Product Design workflows where available:

```text
audit → existing UX/product audit
context + ideation → substantial redesign discovery
product-level reasoning → flows / IA / concept exploration
```

Do not treat Product Design as generic design advice.

### UI UX Pro Max

Use its actual search/data capability for questions involving:

```text
heuristics
accessibility
typography
palette
spacing
layout
design systems
stack-specific guidance
```

### 21st

Use the existing:

```text
aic-ui-components
aic-ui-generate
```

rather than embedding another copy of 21st operational instructions into `aic-product-design-lead`.

### shadcn

Use official shadcn skill/knowledge when shadcn primitives or registries are relevant.

Do not assume the current project uses shadcn.

---

# PART B — External Skill Curation

## 9. Curate rather than bulk-install

Do not install complete upstream repositories.

Every upstream skill must receive one explicit decision:

```text
EXTERNAL_MANAGED
ADAPTED
SKIP_OVERLAP
SKIP_FOREIGN_WORKFLOW
SKIP_NOT_USEFUL
```

For each candidate compare it against the current canonical ai-config skills.

Avoid duplicate ways of performing the same workflow.

---

## 10. Matt Pocock skill curation

The Matt repository remains a candidate source of individually useful engineering skills.

First establish:

1. which Matt skills were previously selected or installed in the owner's legacy environment;
2. which current upstream skills correspond to them;
3. what useful current skills exist upstream;
4. whether an existing `aic-*` already covers the capability.

Do not assume that all Matt skills should be installed.

Do not silently lose a previously selected useful skill.

Create a concise decision matrix:

```text
skill
capability
current ai-config overlap
external assumptions
decision
reason
```

Strong candidates should be evaluated based on actual current upstream behavior, including engineering capabilities such
as TDD and domain-modeling where they fill a genuine gap.

Automatically reject or adapt skills that require a competing project workflow, foreign issue-state machine, or
incompatible global governance.

Examples of capabilities already substantially covered and therefore likely to be skipped unless research proves
otherwise:

```text
research
diagnose
generic planning
generic review
generic implementation
prototype workflow overlapping ai-config UI workflow
```

The final Matt skill list requires owner approval before installation.

---

## 11. OMX decision

Oh My Codex is not a runtime dependency of the target environment.

No OMX skill is currently required by ai-config.

During Phase 9.1:

```text
OMX → REMOVE / no distribution
```

Before removal, verify that no approved retained capability depends on OMX.

After that verification:

- remove OMX from active dependency intent;
- remove its `reference-only` registry/lock entry if nothing still uses it;
- do not distribute OMX notices/content;
- include identified legacy OMX artifacts in the later cleanup proposal.

Do not remove real OMX files yet.

---

# PART C — Design Dependencies

## 12. UI UX Pro Max

Treat UI UX Pro Max as an important external design-intelligence dependency.

Verify the exact authoritative upstream and compare it with any currently installed local copy.

Preferred model:

```text
EXTERNAL_MANAGED
```

Install the complete runtime resource required for useful operation, including where applicable:

```text
SKILL.md
local design data
search scripts
required references/assets
```

Do not reproduce its design database manually.

Do not run the upstream installer as the source of truth.

ai-config should materialize the exact locked resource itself using Phase 7 provenance/integrity infrastructure.

### Runtime prerequisite

UI UX Pro Max currently relies on Python-based search tooling.

ai-config should detect:

```text
python3
or compatible python
```

and report readiness through `doctor`.

Do not install Python/Homebrew automatically in Phase 9.1.

Missing Python should produce a clear dependency diagnostic, not corrupt installation.

---

## 13. Official shadcn skill

Evaluate and, unless current upstream research exposes a blocker, include the official shadcn agent skill as an external
dependency.

Preferred model:

```text
EXTERNAL_MANAGED
```

Source must be the authoritative shadcn repository and an immutable locked resource.

The shadcn skill provides current knowledge about:

```text
components
primitives
registries
component patterns
CLI usage
project context
```

Do not create an `aic-shadcn` replacement merely to duplicate this knowledge.

### CLI boundary

shadcn CLI usage is project-specific.

Do not globally initialize or mutate projects during ai-config setup.

Phase 9.1 must explicitly decide whether the current official skill's CLI invocation semantics are compatible with
ai-config reproducibility.

If the official skill requires mutable/unpinned execution semantics that violate the approved dependency model:

```text
do not silently accept them
```

Instead report whether the correct solution is:

```text
minimal ADAPTED wrapper
or
project-owned CLI execution
```

before final installation.

---

## 14. 21st dependencies

Keep the existing adapted skills:

```text
aic-ui-components
aic-ui-generate
```

Their current pinned upstream provenance remains authoritative until deliberately updated.

The missing dependency is the actual:

```text
21st
```

executable.

Phase 9.1 must add the minimal managed-tool capability required to provision the approved exact `@21st-dev/cli` version.

Do not use:

```text
@latest
npx fallback
global uncontrolled npm install
```

as ai-config installation semantics.

The tool version must be pinned in source-controlled dependency state.

---

# PART D — Managed Tools

## 15. Managed tool model

Add the smallest provider-neutral managed-tool layer needed for approved ai-config capabilities.

Initial required tool:

```text
21st CLI
```

Do not build a general package manager.

A managed tool should have:

```text
tool ID
source/package
exact version
integrity
installation root
executable identity
runtime prerequisites
ownership state
```

Recommended ai-config-owned location:

```text
~/.ai-config/tools/<tool>/<version>/
```

or an equivalent isolated location under ai-config state/data ownership.

Do not use `/usr/local`, Homebrew directories, or system Node directories.

---

## 16. Managed tool installation safety

Tool installation must:

- use an exact locked version;
- validate npm integrity using Phase 7 source metadata;
- avoid lifecycle-script execution unless explicitly reviewed and approved;
- avoid global npm mutation;
- never execute a newly acquired binary before integrity/installation verification;
- preserve previous tool versions until transaction success;
- support rollback/removal through ai-config ownership.

If the exact approved tool cannot be installed safely under these rules:

```text
BLOCKED — owner decision required
```

Do not fall back to `npm install -g`.

---

## 17. Executable discovery

Canonical ai-config skills must not depend on whatever executable happens to appear first on an uncontrolled PATH.

For managed tools, ai-config must provide a deterministic way for installed skills/runtime orchestration to locate the
managed executable.

Do not hardcode personal absolute paths into canonical skills.

Use an ai-config-owned stable resolution mechanism.

---

# PART E — External Product Capabilities

## 18. OpenAI Product Design

Classify:

```text
EXTERNAL_CAPABILITY
```

`aic-product-design-lead` should use it when available.

Do not attempt to vendor or recreate Product Design.

Do not claim ai-config can install it unless a supported public installation contract is verified.

Absence should be reported as reduced evidence availability, not necessarily a blocker.

---

## 19. Browser and Playwright

Treat rendered-state tooling as capability-dependent.

`aic-product-design-lead` may use:

```text
Browser
Playwright
equivalent supported browser tooling
```

when available.

Do not globally install Playwright solely because the design skill mentions it.

If the active project already provides appropriate browser tooling, use it.

Do not introduce project dependencies merely to satisfy the global skill.

---

## 20. MCP / integration audit

For each retained design dependency determine its actual useful access mechanism:

```text
skill
local searchable data
CLI
MCP
plugin
browser capability
```

Preserve useful MCP access where it materially improves the selected design workflow.

However:

- do not preserve OMX MCP/runtime configuration;
- do not copy credentials;
- do not commit tokens/API keys;
- do not configure a new MCP merely because upstream supports one;
- require explicit owner approval before ai-config takes ownership of provider MCP configuration.

The dependency must remain useful even when optional MCP access is unavailable unless MCP is genuinely essential.

---

# PART F — Dependency Lifecycle

## 21. Dependency manifest

Extend the existing source/dependency representation only as much as necessary to answer:

```text
what dependency?
what type?
which upstream?
which exact revision/version?
which resource?
which digest/integrity?
which license?
where installed?
which capability requires it?
```

Do not create a second lock system parallel to Phase 7.

Reuse:

```text
upstream/registry.json
upstream/lock.json
```

for skills and source provenance.

Extend the model minimally for managed tools where needed.

---

## 22. Version/update lifecycle

No dependency updates automatically because upstream changed.

Required lifecycle:

```text
current pinned dependency
→ check upstream candidate
→ deterministic diff
→ provenance/license/integrity review
→ owner/release approval
→ lock bump
→ tests
→ new ai-config version
→ ai-config update
→ installed environment converges
```

`ai-config setup/update` installs the dependency versions declared by the executing ai-config release.

It does not independently chase upstream `latest`.

---

## 23. External-managed skill installation

Extend provider setup/update so external-managed skills are first-class desired artifacts.

On a clean Mac:

```text
ai-config setup --provider codex --apply
```

must install both:

```text
native/adapted canonical skills
+
approved external-managed skills
```

Update must replace an older ai-config-managed external skill when the new ai-config release pins a newer approved
upstream revision.

Locally modified managed external content must be detected as drift.

Do not silently overwrite local modifications.

---

## 24. Provider representations

For external skills, preserve upstream semantics unless provider translation is genuinely required.

Do not mutate upstream skills merely to force the `aic-` naming convention.

External-managed skills retain their upstream names.

Examples conceptually:

```text
aic-plan                → native
aic-product-design-lead → native
ui-ux-pro-max            → external-managed
shadcn                   → external-managed
<tbd Matt skill>         → external-managed
```

Adapted resources use ai-config names.

---

# PART G — Verification Before Cleanup

## 25. Isolated clean-Mac dogfood

Before touching remaining legacy real configuration, use an isolated home to prove that current ai-config can
reconstruct the intended environment.

Verify:

```text
global contract
native skills
aic-product-design-lead
adapted 21st skills
selected Matt external skills
UI UX Pro Max
shadcn skill
21st managed CLI
dependency doctor
setup → NOOP
update → NOOP
```

No OMX dependency may be required for success.

---

## 26. Real environment additive migration

After isolated dogfood passes, produce a read-only real migration preview for adding the newly approved Phase 9.1
artifacts.

Do not remove legacy content in the same transaction.

First:

```text
install/adopt new environment
→ doctor
→ setup NOOP
```

Only after the new environment is verified may cleanup be considered.

Use the Phase 9 preview-fingerprint approval mechanism for any real mutation requiring conflict replacement.

---

# PART H — Legacy Cleanup

## 27. Real legacy inventory

Perform a read-only inventory of remaining global configuration after the new environment is successfully installed.

Classify every relevant legacy artifact:

```text
REMOVE
PRESERVE
MIGRATED
UNKNOWN
```

Expected removal candidates include:

```text
OMX skills
OMX runtime/state
OMX generated support artifacts
obsolete duplicated skills
old product-design-lead after successful replacement
```

Expected preservation candidates include:

```text
unrelated user-owned skills still desired
provider auth
config.toml
approved plugins
approved MCP integrations
external capability configuration
```

Do not infer that every non-`aic-*` skill should be deleted.

---

## 28. Cleanup approval gate

Return an exact deletion proposal before deleting anything.

Example:

```text
REMOVE legacy artifact X
REMOVE OMX artifact Y
PRESERVE external skill Z
PRESERVE provider config
```

Then STOP.

Owner approval is mandatory.

No broad:

```text
rm -rf ~/.agents/skills
```

or equivalent is allowed.

---

## 29. Cleanup execution

Only after explicit owner approval:

- remove exactly approved legacy artifacts;
- do not remove ai-config-managed resources;
- do not remove retained external dependencies;
- preserve unrelated user/provider configuration;
- keep rollback/recovery evidence where applicable.

After cleanup run:

```text
ai-config doctor --provider codex
ai-config setup --provider codex
```

Expected:

```text
healthy
NOOP
```

---

# PART I — Tests and Verification

## 30. Required tests

Add deterministic coverage for:

### Product Design Lead

- extraction/adaptation boundaries;
- no OMX runtime references;
- complementary evidence contract preserved;
- Product Design focused workflow preserved;
- UI UX Pro Max preserved;
- 21st routed through `aic-ui-components` / `aic-ui-generate`;
- shadcn preserved as evidence source;
- browser/rendered verification preserved;
- explicit-only provider behavior.

### External-managed skills

- immutable source/digest/license;
- clean installation;
- NOOP convergence;
- version replacement;
- managed drift detection;
- rollback;
- unrelated skills preserved.

### Managed 21st tool

- exact package version;
- integrity;
- isolated installation root;
- executable resolution;
- no uncontrolled global npm mutation;
- rollback/removal;
- missing runtime diagnostic.

### Dependency doctor

- UI UX Pro Max present/missing;
- Python ready/missing;
- shadcn skill present;
- 21st CLI ready/missing;
- registry/lock valid;
- external-managed drift.

### Legacy cleanup

- exact artifact authorization;
- unrelated resources preserved;
- no broad directory deletion;
- cleanup preview is read-only.

---

## 31. Documentation

Create/update only what the implemented architecture requires:

```text
docs/architecture/dependency-management.md
docs/architecture/core-workflow.md
docs/architecture/ui-extensions.md
docs/providers/codex.md
docs/providers/claude.md
README.md
THIRD_PARTY_NOTICES.md
upstream/README.md
```

Keep documentation concise.

Do not write Phase 10 release documentation yet.

---

## 32. Explicit exclusions

Do not:

- restore OMX orchestration;
- bulk-install Matt;
- write replacements for good external skills without need;
- auto-update from `latest`;
- install Homebrew/Python automatically;
- globally initialize shadcn projects;
- install Playwright into arbitrary projects;
- copy credentials;
- expose API keys;
- auto-configure provider MCP without approval;
- remove unknown legacy files;
- publish npm;
- create a release/tag;
- start Phase 10.

---

# PART J — Mandatory Owner Gates

## 33. Gate 1 — dependency curation

Before implementing the final external dependency set, return:

```text
DEPENDENCY CURATION APPROVAL REQUIRED
```

with:

- extracted `product-design-lead` dependency map;
- proposed `aic-product-design-lead` adaptation;
- exact Matt skill decisions;
- UI UX Pro Max source/mode;
- shadcn source/mode;
- 21st CLI version/install proposal;
- MCP/plugin decisions;
- OMX removal confirmation.

Owner approves the dependency set.

---

## 34. Gate 2 — real additive migration

After implementation and isolated dogfood:

```text
REAL DEPENDENCY MIGRATION APPROVAL REQUIRED
```

Return exact real actions/fingerprint.

Owner approval required before mutation.

---

## 35. Gate 3 — legacy cleanup

After the new environment is healthy:

```text
LEGACY CLEANUP APPROVAL REQUIRED
```

Return exact deletion/preservation proposal.

Owner approval required before cleanup.

---

## 36. Definition of Done

Phase 9.1 is complete when:

- real `product-design-lead` has been safely preserved;
- canonical `aic-product-design-lead` exists;
- its complementary design evidence workflow is retained;
- approved Matt skills are curated and installed, not merely referenced;
- UI UX Pro Max is external-managed and operational;
- official shadcn skill is installed according to an approved reproducible model;
- existing 21st adaptations remain operational;
- required 21st CLI is managed reproducibly by ai-config;
- external Product Design/browser capabilities remain usable where available;
- dependency update lifecycle is source-controlled and review-based;
- clean isolated setup reconstructs the intended environment;
- real Codex environment receives the new dependencies;
- remaining OMX/legacy artifacts are explicitly inventoried;
- approved legacy cleanup completes without deleting retained capabilities;
- final doctor is healthy;
- final setup preview is NOOP;
- no public release is performed.

---

## 37. Implementation sequence

### Stage 1 — audit and curation

1. Read current architecture and Phase 7–9 implementation.
2. Extract current `product-design-lead` read-only.
3. Audit its dependency graph.
4. Inspect current real retained design-tool configuration read-only.
5. Research/resolve current authoritative Matt, UI UX Pro Max, shadcn and 21st sources.
6. Produce dependency decision matrix.
7. STOP for Gate 1.

### Stage 2 — repository implementation

After Gate 1 approval:

8. Add `aic-product-design-lead`.
9. Register/pin approved external skills.
10. Implement external-managed skill installation.
11. Implement minimal 21st managed-tool layer.
12. Extend doctor.
13. Add provenance/licenses/notices.
14. Add tests.
15. Run full repository verification.

### Stage 3 — isolated dogfood

16. Pack actual ai-config artifact.
17. Reconstruct complete intended environment in isolated roots.
18. Verify doctor + NOOP without OMX.
19. STOP for Gate 2 with real migration preview.

### Stage 4 — additive real migration

After Gate 2 approval:

20. Install/adopt the approved new dependencies.
21. Verify doctor.
22. Verify setup NOOP.

### Stage 5 — cleanup

23. Inventory remaining legacy environment read-only.
24. Produce REMOVE/PRESERVE proposal.
25. STOP for Gate 3.
26. Execute only approved cleanup.
27. Run final doctor + NOOP.
28. Report Phase 9.1 completion.
29. STOP — no Phase 10 and no commit without owner instruction.

---

## Phase invariant

> **Own what is uniquely ours, reuse what upstream already does well, pin everything reproducibly, and remove legacy
only after the replacement environment proves it no longer needs it.**
