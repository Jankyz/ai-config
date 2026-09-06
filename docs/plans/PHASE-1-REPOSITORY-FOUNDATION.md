# AI Config — Phase 1: Repository Foundation Implementation Plan

**Status:** approved for implementation  
**Approved:** 2026-09-01  
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Phase:** 1 of 10  
**Runtime baseline:** Node.js 24  
**Repository license:** MIT  
**Implementation authority:** implementation is authorized only within the scope of this approved plan  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Create the minimal, production-grade repository foundation required to build `ai-config` safely in later phases.

Phase 1 establishes:

- repository structure;
- package metadata;
- TypeScript toolchain;
- CLI entry-point skeleton;
- canonical configuration locations;
- provider/source/core boundaries;
- validation and test architecture;
- documentation structure;
- CI-ready scripts;
- runtime compatibility contract;
- public-repository hygiene.

Phase 1 does **not** implement the actual installer, provider configuration, external skill installation, project
bootstrap workflow, or production skills.

The purpose of this phase is to ensure that all subsequent work happens inside a stable, explicit, testable architecture
rather than allowing repository structure and responsibilities to emerge accidentally during implementation.

---

## 2. Governing architecture

All implementation must comply with:

`docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`

The Master Architecture is the authoritative architectural baseline.

If this Phase 1 plan conflicts with the Master Architecture:

1. stop implementation on the conflicting branch;
2. identify the exact conflict;
3. establish the relevant repository and technical facts;
4. present available options;
5. provide a recommended option with rationale and trade-offs;
6. obtain owner approval;
7. update the canonical architecture if required;
8. only then continue.

Phase-specific implementation must never silently redefine a project-wide architectural decision.

---

## 3. Core architectural principle

`ai-config` is:

> a provider-neutral configuration manager for AI coding-agent environments.

It is not:

- an agent runtime;
- an agent orchestrator;
- an Oh My Codex replacement;
- a multi-agent framework;
- a persistent agent-memory system;
- a general workflow engine;
- a generic plugin marketplace.

The repository architecture must keep configuration management separate from agent execution.

Providers such as Codex and Claude execute work.

`ai-config` manages the environment, standards, skills, provider adaptations, dependencies, and reproducible
configuration required by those providers.

---

## 4. Required working model

The project follows this operating sequence:

```text
understand
    ↓
research / clarify when required
    ↓
approved implementation plan
    ↓
OWNER APPROVAL
    ↓
autonomous implementation
    ↓
automated verification
    ↓
manual verification if required
    ↓
OWNER APPROVAL
    ↓
explicit commit instruction
```

The implementation agent must not:

- silently expand scope;
- redesign approved behavior;
- make material product decisions;
- start later phases automatically;
- commit because implementation is complete.

---

## 5. Phase 1 scope

Phase 1 includes only repository-foundation work.

### Included

- Node.js 24 compatible package structure;
- `npx` and `bunx` execution compatibility architecture;
- TypeScript;
- executable CLI skeleton;
- repository scripts;
- test runner;
- linting;
- formatting;
- type checking;
- directory boundaries;
- minimal domain contracts/interfaces required to establish architecture;
- example configuration manifests where structurally useful;
- documentation scaffold;
- test fixtures;
- CI workflow;
- runtime compatibility smoke tests where practical;
- package-content inspection;
- public-repository safety settings;
- MIT license.

### Excluded

Do not implement:

- production `setup`;
- production `update`;
- production `doctor`;
- production `status`;
- production `project init`;
- Codex configuration writes;
- Claude configuration writes;
- provider environment mutation;
- third-party skill downloading;
- npm global dependency installation;
- GitHub source resolution;
- backups;
- rollback;
- migration logic;
- drift detection;
- ownership mutation logic;
- real Matt Pocock dependencies;
- real OMX dependencies;
- real 21st dependencies;
- external skill registry behavior;
- UI skills;
- Lore commit execution;
- project bootstrap behavior;
- real provider installation;
- remote network requests;
- release automation;
- npm publishing.

These belong to later phases.

---

## 6. Runtime decision

The v1 runtime baseline is:

> **Node.js 24**

The released package must also support execution through:

```bash
npx <package-name>
```

and:

```bash
bunx <package-name>
```

Bun is not a required dependency of the project.

The implementation should use JavaScript/TypeScript APIs that remain compatible with Node.js 24 and Bun wherever
practical.

Do not introduce a runtime-abstraction framework without demonstrated need.

Use standard platform APIs where they provide sufficient correctness and portability.

---

## 7. Runtime support policy

Node.js 24 is the authoritative v1 runtime baseline.

Runtime support must be declared in one authoritative package/tooling location rather than repeated across unrelated
project documents.

Future supported-runtime changes should not require changes to individual skills.

CI must test the supported Node baseline.

Bun compatibility must be verified independently where Bun is available.

Runtime compatibility claims must be based on executed verification rather than assumption.

---

## 8. `npx` and `bunx` execution requirement

The public package must be invokable through both:

```bash
npx <package-name>
```

and:

```bash
bunx <package-name>
```

without maintaining separate application implementations.

Both surfaces must ultimately execute the same application entry point and business logic.

Phase 1 must establish a launcher/package structure that preserves this requirement.

Do not create:

- a Node-specific application and separate Bun application;
- duplicated command implementations;
- runtime-specific business logic unless technically unavoidable.

If exact Bun behavior cannot be verified in the implementation environment, report it explicitly as an unverified
compatibility item.

Do not claim compatibility without evidence.

---

## 9. Development package manager

Use:

> **npm**

as the canonical development package manager for Phase 1.

Rationale:

- npm ships with Node;
- it minimizes bootstrap requirements;
- the project will be distributed through npm;
- `npx` becomes straightforward to test;
- Bun remains an execution compatibility target rather than a repository requirement.

Use:

```text
package-lock.json
```

as the dependency lockfile.

Do not maintain multiple package-manager lockfiles in v1.

Specifically, do not add a Bun lockfile solely because `bunx` must be supported.

---

## 10. Package safety

The package must not be accidentally publishable during early development.

Phase 1 must set:

```json
{
  "private": true
}
```

until the dedicated public-release phase explicitly changes this decision.

The final npm package name is not required in Phase 1.

Use a provisional internal package name if necessary.

Do not reserve, publish, or configure a real npm release during this phase.

---

## 11. Repository license

The repository uses the:

> **MIT License**

A standard MIT `LICENSE` file must exist at repository root.

Third-party materials introduced in later phases must still undergo separate license and attribution review.

The repository's MIT license does not override upstream licensing obligations.

---

## 12. Existing repository state

The repository already contains:

```text
docs/
└── architecture/
    ├── AI-CONFIG-MASTER-ARCHITECTURE-V1.md
    └── README.md
```

and this implementation plan should exist at:

```text
docs/plans/PHASE-1-REPOSITORY-FOUNDATION.md
```

These files must be preserved.

`docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md` is canonical architecture.

The currently empty:

```text
docs/architecture/README.md
```

may be populated during this phase as a concise architecture-document index.

Do not rewrite the Master Architecture merely to make implementation easier.

---

## 13. Proposed repository structure

The target structure after Phase 1 should approximately be:

```text
ai-config/
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
├── LICENSE
├── .gitignore
├── .editorconfig
│
├── src/
│   ├── cli/
│   │   └── index.ts
│   │
│   ├── core/
│   │   └── index.ts
│   │
│   ├── installer/
│   │   └── index.ts
│   │
│   ├── providers/
│   │   ├── index.ts
│   │   ├── codex/
│   │   └── claude/
│   │
│   ├── sources/
│   │   └── index.ts
│   │
│   ├── state/
│   │   └── index.ts
│   │
│   └── validation/
│       └── index.ts
│
├── config/
│   ├── manifest.example.yaml
│   ├── providers/
│   │   ├── codex.example.yaml
│   │   └── claude.example.yaml
│   └── dependencies.example.yaml
│
├── standards/
│   └── README.md
│
├── skills/
│   └── README.md
│
├── templates/
│   └── project/
│       └── README.md
│
├── upstream/
│   └── README.md
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│   ├── architecture/
│   │   ├── README.md
│   │   └── AI-CONFIG-MASTER-ARCHITECTURE-V1.md
│   │
│   ├── plans/
│   │   └── PHASE-1-REPOSITORY-FOUNDATION.md
│   │
│   ├── providers/
│   ├── skills/
│   ├── migrations/
│   └── contributing/
│
└── .github/
    └── workflows/
        └── ci.yml
```

This structure is an architectural target, not an instruction to generate meaningless placeholder files.

Do not create files merely because they appear in this diagram.

If a directory has no meaningful tracked content yet, either:

- defer its physical creation; or
- add a concise README only where the directory's contract is already useful.

Avoid arbitrary `.gitkeep` files.

---

## 14. Root README

Create a concise public-facing root:

```text
README.md
```

It should explain:

- what `ai-config` is;
- the problem it intends to solve;
- current development status;
- that the project is pre-release;
- provider-neutral architecture;
- Codex as the first-class initial provider;
- Claude as a required provider;
- intended `npx` / `bunx` experience;
- where architecture documentation lives;
- that production setup commands are not implemented yet.

The README must not advertise functionality that does not exist.

Do not add:

- fake install commands presented as working;
- fake release versions;
- fake badges;
- fake npm links;
- fake compatibility claims;
- marketing copy implying production readiness.

---

## 15. TypeScript

Use TypeScript in strict mode.

Required principles:

```text
strict typing
ESM-first
no implicit any
no silent JavaScript fallback
clear source/output separation
```

Build output should live outside:

```text
src/
```

Recommended:

```text
dist/
```

Generated build output must not be committed unless a later release architecture explicitly requires it.

---

## 16. Module system

Use ESM.

The package should use an ESM configuration such as:

```json
{
  "type": "module"
}
```

Do not introduce CommonJS compatibility unless an actual runtime compatibility requirement demonstrates the need.

Avoid maintaining dual CJS/ESM builds in Phase 1.

---

## 17. CLI architecture

Phase 1 only needs enough CLI functionality to prove the package execution architecture.

Required minimal surfaces:

```bash
ai-config --version
```

and:

```bash
ai-config --help
```

No production configuration commands should perform real actions.

If future command names are shown in help, they must be clearly marked as unavailable or omitted entirely.

Prefer omission.

Do not simulate successful commands that do nothing.

---

## 18. CLI framework policy

Avoid adopting a large CLI framework without evidence that it materially improves correctness or maintainability.

Do not add dependencies merely for:

- colors;
- banners;
- spinners;
- ASCII logos;
- interactive prompts;
- decorative tables.

A lightweight argument parser or small maintained CLI library may be used if justified.

Before introducing a production CLI dependency, document why the standard platform approach is insufficient.

---

## 19. Dependency policy

Use the rule:

> Add a dependency only where it materially improves correctness, maintainability, portability, or testability.

For every production dependency added in Phase 1, the completion report must state:

- package name;
- purpose;
- why native functionality was insufficient;
- whether it becomes part of the public runtime dependency tree.

Development tooling dependencies are acceptable when justified.

Avoid multiple packages performing the same responsibility.

---

## 20. Tooling responsibilities

Phase 1 requires one clear tool for each relevant responsibility:

- TypeScript compilation;
- test execution;
- linting;
- formatting.

Select current maintained tools during implementation.

Do not hardcode package versions in this plan.

Versions must be captured by:

```text
package-lock.json
```

after installation.

Do not introduce overlapping lint/format/type-check systems unless there is a concrete technical need.

---

## 21. Required package scripts

The project should expose stable scripts for at least:

```text
build
test
test:unit
test:integration
typecheck
lint
format
format:check
check
```

The canonical:

```text
npm run check
```

must provide a single repository-health gate.

Conceptually:

```text
check
  ↓
typecheck
lint
format:check
test
build
```

The implementation may optimize sequencing provided equivalent verification is preserved.

---

## 22. Architectural boundaries

Phase 1 must establish the following conceptual boundaries.

### `src/cli`

Responsibilities:

- CLI argument parsing;
- command dispatch;
- user-facing output boundaries.

Must not contain:

- provider-specific filesystem logic;
- installation business rules;
- skill resolution logic.

---

### `src/core`

Responsibilities:

- provider-neutral domain contracts;
- provider-neutral orchestration;
- central configuration-management concepts.

Must not directly know:

```text
~/.codex
~/.claude
```

or other provider-specific paths.

---

### `src/providers`

Responsibilities:

- provider-specific representations;
- provider capabilities;
- provider paths;
- provider-specific configuration formats.

Initial conceptual adapters:

```text
providers/codex
providers/claude
```

Do not implement real environment mutation in Phase 1.

---

### `src/sources`

Responsibilities:

- external configuration/skill source abstractions;
- future source resolution boundary.

No real remote downloading in Phase 1.

---

### `src/installer`

Responsibilities:

- future filesystem application boundaries;
- transaction-related concerns.

Do not implement the production installer yet.

Provider policy must not leak into installer primitives.

---

### `src/state`

Responsibilities:

- future local installation-state contracts;
- receipts;
- versions;
- managed-artifact metadata.

Do not implement real `~/.ai-config` persistence in Phase 1 unless the minimum is necessary for an architectural test.

---

### `src/validation`

Responsibilities:

- configuration/schema validation boundaries;
- reusable validation primitives.

Avoid building a generic validation framework without a current caller.

---

## 23. Dependency direction

The intended conceptual dependency direction is:

```text
CLI
 ↓
Core
 ↓
domain contracts

Providers ─┐
Sources   ─┤
Installer ─┼── conform to core/domain contracts
State     ─┤
Validation─┘
```

Avoid circular dependencies.

Provider implementations must not become dependencies of unrelated subsystems.

Core must not import provider-specific constants merely for convenience.

---

## 24. Provider abstraction

Phase 1 should define the smallest useful provider abstraction required to stabilize architectural boundaries.

The eventual provider lifecycle may include concepts such as:

```text
detect
inspect
planInstall
install
verify
update
uninstall
```

However, Phase 1 must not implement speculative behavior solely because it may exist later.

Prefer:

- a minimal provider identity;
- a capability model;
- small contracts clearly required by current architecture.

Do not create fake methods returning placeholders merely to fill an interface.

Architecture needs a stable seam, not a speculative framework.

---

## 25. Provider capabilities

The architecture must allow providers to declare capabilities such as:

```text
globalInstructions
projectInstructions
skills
explicitSkillInvocation
implicitSkillInvocation
mcp
subagents
settings
hooks
```

Phase 1 only needs to model capabilities that materially help establish provider-neutral architecture.

No capability needs production implementation yet.

Unsupported capabilities must eventually be representable explicitly rather than guessed.

---

## 26. Canonical manifests

Phase 1 should establish canonical locations for future configuration manifests.

Human-authored canonical configuration should use:

> YAML

Machine-generated runtime state may later use:

> JSON

Maintain the conceptual separation:

```text
human-authored configuration → YAML
machine-generated state      → JSON
```

The Phase 1 example manifests must not pretend to be final schemas.

Their purpose is to establish location and architectural intent.

---

## 27. Example manifest responsibilities

Future manifests are expected to describe concepts such as:

```text
providers
skills
standards
packages
external sources
compatibility
version pins
installation policy
```

Phase 1 must not invent detailed schema fields without a concrete consumer.

If example YAML is added, keep it intentionally minimal and mark it as non-final.

---

## 28. External upstream architecture

The project must eventually be able to consume selected resources from:

- Oh My Codex;
- `mattpocock/skills`;
- other reviewed repositories;
- npm packages;
- other explicitly approved sources.

Phase 1 must not install any of them.

The:

```text
upstream/
```

documentation should establish these rules:

1. external dependencies are declared;
2. versions/revisions are pinned;
3. upstream `main` / `HEAD` is never blindly followed by normal setup;
4. licenses must be known before vendoring;
5. adapted resources become controlled `ai-config` artifacts;
6. upstream provenance remains documented;
7. updates require review.

---

## 29. Skills directory

During Phase 1:

```text
skills/
```

contains only documentation of the directory contract.

Do not implement production skills yet.

Its README should establish the future distinction between:

```text
native
vendored/adapted
external-managed
```

skills.

It should also establish that workflow skills are intended to be explicitly invoked unless their design explicitly
authorizes model invocation.

---

## 30. Standards directory

During Phase 1:

```text
standards/
```

contains only documentation of its responsibility.

Future standards may include:

```text
planning
execution
verification
commits
code quality
product design
```

Do not move current global OMX text into these files during Phase 1.

The redesign of global guidance happens in a later dedicated phase.

---

## 31. Templates directory

During Phase 1:

```text
templates/project/
```

contains only documentation of its future role.

Do not implement project bootstrap templates yet.

Future project bootstrap may manage:

```text
AGENTS.md
CONTEXT.md
ARCHITECTURE.md
DESIGN.md
docs/adr/
docs/research/
docs/plans/
docs/specs/
docs/testing/
```

but that work is explicitly outside Phase 1.

---

## 32. Runtime state safety

Phase 1 code must not mutate the developer's real:

```text
~/.ai-config
~/.codex
~/.claude
```

directories.

Tests must never depend on or write to the real user HOME.

Future filesystem behavior must be designed around an explicitly resolved or injectable home-directory boundary.

Integration tests must use isolated temporary directories.

No test should succeed only because the developer already has Codex, Claude or OMX configured locally.

---

## 33. Test architecture

Testing infrastructure must exist before production installer behavior is implemented.

Required test categories:

```text
tests/unit/
tests/integration/
tests/fixtures/
```

### Unit tests

For pure or mostly pure logic.

Future examples include:

```text
manifest parsing
capability resolution
path calculation
ownership decisions
hash comparison
```

### Integration tests

For filesystem and provider-adapter behavior using temporary environments.

Future examples include:

```text
fresh installation
existing configuration
managed update
drift
backup
rollback
```

### Fixtures

Representative safe configuration/filesystem inputs.

Fixtures must contain no:

- real credentials;
- personal paths;
- private repository data;
- actual provider tokens.

---

## 34. Required Phase 1 tests

At minimum Phase 1 must prove:

1. dependency installation succeeds;
2. TypeScript compiles;
3. type checking succeeds;
4. linting succeeds;
5. formatting check succeeds;
6. unit test runner works;
7. integration test runner works;
8. CLI entry point executes;
9. `--version` works;
10. `--help` works;
11. tests do not depend on the developer's real HOME;
12. package contents can be inspected before publication;
13. Node.js 24 execution succeeds.

If Bun is available:

14. verify execution through Bun/bunx-compatible surface.

If Bun is unavailable:

- report Bun compatibility as untested;
- do not mark it as passed;
- do not block all Phase 1 work solely because Bun is unavailable locally unless the approved implementation requires
  it.

---

## 35. Package-content verification

Phase 1 must provide a repeatable way to inspect which files would eventually be included in the npm package.

The future package must avoid accidentally shipping:

```text
tests
private fixtures
developer local state
logs
temporary files
secrets
unrelated documentation
machine-specific configuration
```

Configure package inclusion intentionally.

Do not rely solely on accidental npm packaging defaults.

No actual publish occurs in Phase 1.

---

## 36. CI

Create a minimal GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

CI should validate repository health.

At minimum it should:

```text
install dependencies from lockfile
typecheck
lint
format check
run tests
build
```

Use Node.js 24 as the v1 baseline.

If adding a broader Node matrix materially improves compatibility confidence without unnecessary complexity, explain the
decision before expanding beyond the approved baseline.

Bun compatibility may be a separate CI job if straightforward and stable.

CI must not:

- publish;
- create releases;
- require secrets;
- configure Codex;
- configure Claude;
- mutate external services.

---

## 37. No automatic publishing

Phase 1 explicitly excludes:

```text
npm publish
GitHub releases
semantic-release
changesets publishing
automatic version bumps
release tags
release credentials
```

Release automation belongs to the dedicated public-release phase.

---

## 38. Development version

Use an unmistakably pre-release development version.

Recommended initial version:

```text
0.0.0
```

Do not imply API stability or production readiness.

Final release versioning strategy is deferred.

---

## 39. Documentation architecture

Phase 1 should establish the following conceptual documentation locations:

```text
docs/architecture/
docs/plans/
docs/providers/
docs/skills/
docs/migrations/
docs/contributing/
```

Responsibilities:

### `docs/architecture/`

Durable system architecture and major architectural invariants.

### `docs/plans/`

Approved implementation plans and historical execution plans.

### `docs/providers/`

Provider-specific technical documentation.

### `docs/skills/`

Skill architecture, contracts and compatibility information.

### `docs/migrations/`

Future configuration/version migration documentation.

### `docs/contributing/`

Future public contribution guidance.

Do not create long placeholder documents merely to populate these directories.

---

## 40. Architecture README

Populate:

```text
docs/architecture/README.md
```

as a concise index.

It should explain:

- what belongs in architecture documentation;
- which file is the canonical Master Architecture;
- document-status conventions;
- architecture approval expectations;
- relationship between architecture and implementation plans.

It must not duplicate the contents of the Master Architecture.

---

## 41. Public repository hygiene

Phase 1 must establish a safe public-repository baseline.

Repository content must contain:

- no API keys;
- no tokens;
- no passwords;
- no private URLs;
- no personal absolute paths;
- no hardcoded `/Users/<name>/...`;
- no machine identifiers;
- no provider credentials;
- no private repo references unless deliberately public;
- no accidental generated logs;
- no local runtime state.

Use environment-independent paths.

---

## 42. Package installation safety

Downloading or installing the npm package itself must be side-effect free.

Future behavior such as:

```bash
npm install <package>
```

must not configure the user's AI environment.

Do not use npm lifecycle hooks such as:

```text
postinstall
preinstall
install
```

to mutate the user's machine.

Global configuration changes may eventually occur only after an explicit user command such as:

```bash
ai-config setup
```

This is a hard safety invariant.

---

## 43. Dependency lifecycle-script policy

Do not introduce lifecycle scripts that execute arbitrary environment mutations.

If a dependency introduces meaningful lifecycle behavior, inspect and report it.

No remote script should be piped directly into a shell as part of Phase 1.

---

## 44. Logging

Do not create a logging framework in Phase 1.

Minimal CLI output is sufficient.

Future logging architecture must ensure that:

- secrets are not logged;
- paths are handled intentionally;
- diagnostic detail can eventually be enabled without changing business logic.

Do not add a logging dependency without a current need.

---

## 45. Error architecture

Do not create a large custom error hierarchy in Phase 1.

Use clear typed errors only where they improve control flow or testing.

The future architecture should be able to distinguish areas such as:

```text
configuration
compatibility
filesystem
provider
dependency
validation
conflict
```

but speculative classes are not required now.

---

## 46. Code-quality rules

Phase 1 implementation must prefer:

- small modules;
- clear responsibilities;
- explicit boundaries;
- minimal dependencies;
- simple data structures;
- testable logic;
- separation of pure logic from filesystem side effects;
- existing platform APIs;
- readable TypeScript.

Avoid:

- generic framework building;
- unnecessary factories;
- unnecessary base classes;
- unnecessary dependency-injection frameworks;
- abstract repositories without callers;
- catch-all utility modules;
- duplicate domain models;
- premature plugin systems;
- speculative extensibility;
- wrappers around trivial standard-library calls.

---

## 47. Anti-slop requirement

Phase 1 should not produce repository noise.

Do not create:

- giant generic CONTRIBUTING files;
- dozens of empty architectural documents;
- unnecessary badges;
- decorative configuration;
- empty interfaces without real consumers;
- unnecessary index/barrel files;
- helper abstractions used once;
- placeholders pretending future functionality exists;
- fake examples;
- TODO forests.

Every created file must have a present, explainable purpose.

---

## 48. Scope-change rule

If implementation reveals that a change outside this plan would materially improve the architecture:

1. do not silently implement it;
2. document the discovered need;
3. explain why it matters;
4. recommend whether to:
    - amend Phase 1,
    - defer it,
    - modify Master Architecture;
5. wait for owner decision if the choice materially changes architecture or scope.

Minor implementation details inside an approved architectural boundary do not require owner approval.

---

## 49. Manual verification

After automated work is complete, the owner must manually review the Phase 1 result.

The implementation agent must explicitly request verification of:

- repository structure;
- root README accuracy;
- documentation clarity;
- absence of overstated functionality;
- architectural boundaries;
- package dependencies;
- CLI help/version output;
- absence of personal data;
- absence of unexpected generated files;
- general repository cleanliness.

The implementation agent must provide exact commands or actions where appropriate.

No commit occurs before this manual review and explicit owner instruction.

---

## 50. Automated verification

Before reporting Phase 1 complete, the implementation agent must run and report the exact results of all applicable
checks.

Required:

```bash
npm install
```

or, after lockfile creation:

```bash
npm ci
```

plus:

```text
typecheck
lint
format check
unit tests
integration tests
build
canonical check command
CLI --help smoke test
CLI --version smoke test
package-content inspection
```

Prefer invoking the project's canonical scripts after they exist.

For example:

```bash
npm run check
```

must pass before completion.

If Bun is installed, also run the applicable Bun/bunx compatibility smoke test.

Any failing required verification must be investigated and fixed before Phase 1 is reported complete unless a genuine
blocking decision requires owner input.

---

## 51. Self-review before completion

After implementation and automated checks, perform a final self-review against:

1. `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`;
2. this Phase 1 plan;
3. Phase 1 scope exclusions;
4. public repository safety;
5. dependency minimalism;
6. architectural boundaries;
7. test isolation;
8. unnecessary code/files.

Remove unnecessary code rather than rationalizing it.

Do not use the self-review to expand scope.

---

## 52. Completion report contract

The final Phase 1 implementation report must include:

### Status

One of:

```text
COMPLETE — awaiting manual verification
BLOCKED — owner decision required
```

Do not report `COMPLETE` if required automated verification failed.

### Files created

List exact paths.

### Files modified

List exact paths and why.

### Dependencies added

Separate:

```text
production dependencies
development dependencies
```

Explain the purpose of every production dependency.

### Architectural decisions

List only decisions actually made during implementation.

Do not restate the entire Master Architecture.

### Verification evidence

For every required verification command provide:

```text
command
result
```

### Bun verification

State explicitly:

```text
passed
failed
not tested — Bun unavailable
```

### Manual verification required

Provide exact owner-review steps.

### Known gaps

Anything not tested or intentionally deferred.

### Deviations from plan

List every meaningful deviation and why it occurred.

If none:

```text
None.
```

### Open decisions

List decisions requiring owner action before Phase 2.

If none:

```text
None.
```

### Commit

Always state:

```text
No commit created. Awaiting explicit owner instruction.
```

---

## 53. Definition of Done

Phase 1 is complete only when all of the following are true:

- repository structure reflects the Master Architecture;
- MIT license exists;
- Node.js 24 is the runtime baseline;
- npm is the canonical development package manager;
- package cannot accidentally publish;
- package dependencies install successfully;
- package lockfile exists;
- TypeScript strict mode is enabled;
- ESM is used;
- project builds successfully;
- typecheck passes;
- lint passes;
- formatting check passes;
- unit tests pass;
- integration tests pass;
- CLI skeleton executes;
- `--help` works;
- `--version` works;
- canonical repository health check passes;
- CI exists;
- CI represents the approved Node.js 24 baseline;
- tests do not write to the real HOME;
- no real Codex configuration is modified;
- no real Claude configuration is modified;
- no real `~/.ai-config` state is created by tests;
- package-content inspection exists;
- no production installer behavior exists;
- no external skills are installed;
- no external network-dependent configuration behavior exists;
- no functionality is falsely advertised;
- no personal absolute paths exist;
- no credentials exist;
- no unnecessary production dependencies were added;
- package installation itself has no configuration side effects;
- no auto-publish behavior exists;
- owner manual review is completed;
- no material unresolved architectural decision blocks Phase 2.

---

## 54. Decisions confirmed before implementation

The following decisions are approved and must not be reopened during Phase 1 without new evidence demonstrating a
material problem.

### Repository license

```text
MIT
```

### Runtime baseline

```text
Node.js 24
```

### Development package manager

```text
npm
```

### Module system

```text
ESM
```

### Implementation language

```text
TypeScript
```

### Distribution requirement

The eventual public CLI must support:

```text
npx
bunx
```

### Provider architecture

```text
provider-neutral core
+
provider adapters
```

### Initial providers

```text
Codex — first-class initial provider
Claude — required supported provider
```

### Commit policy

```text
never automatically commit
```

### Planning policy

```text
material changes require an approved plan before implementation
```

---

## 55. Decisions intentionally deferred

The following decisions do not block Phase 1 and must not be invented merely to complete this phase:

- final npm package name;
- npm organization/scope;
- public release version;
- full installer API;
- final upstream registry schema;
- complete manifest schema;
- final Matt Pocock skill selection;
- final OMX skill selection;
- final external skill source strategy implementation;
- actual Codex adapter behavior;
- actual Claude adapter behavior;
- exact global `AGENTS.md`;
- exact global `CLAUDE.md`;
- project bootstrap implementation;
- Linux support;
- Windows support;
- profile support;
- cloud synchronization;
- plugin marketplace;
- automatic model selection;
- release automation.

Each belongs to a later approved plan.

---

## 56. Implementation sequence

The implementation agent must execute Phase 1 in this order unless a concrete technical dependency requires a small
sequencing adjustment.

### Step 1 — Repository inspection

Read completely:

```text
docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md
docs/architecture/README.md
docs/plans/PHASE-1-REPOSITORY-FOUNDATION.md
```

Inspect the complete existing repository.

Establish:

- existing files;
- current Git state;
- existing tooling;
- existing configuration;
- any unexpected repository content.

Do not modify files before baseline inspection is complete.

---

### Step 2 — Validate plan compatibility

Compare the actual repository state with:

- Master Architecture;
- this Phase 1 plan.

If a material conflict exists:

- stop on that branch;
- report it;
- recommend a resolution.

Otherwise continue autonomously.

---

### Step 3 — Establish package foundation

Create the minimum required:

```text
package.json
package-lock.json
tsconfig.json
.gitignore
.editorconfig
```

and required development tooling.

Set:

```text
private: true
```

Use Node.js 24 as the baseline.

Use ESM.

---

### Step 4 — Establish source boundaries

Create only source modules required to represent approved architectural boundaries.

Do not populate them with speculative production behavior.

Keep the architecture minimal.

---

### Step 5 — Establish testing infrastructure

Set up:

```text
tests/unit/
tests/integration/
tests/fixtures/
```

Ensure test execution is isolated from the real user environment.

Create at least one meaningful test in each required test category rather than empty infrastructure.

---

### Step 6 — Implement CLI skeleton

Implement the minimum executable CLI required to prove packaging/runtime architecture.

Required:

```text
--help
--version
```

No real setup/configuration behavior.

---

### Step 7 — Establish configuration/documentation scaffolding

Add only meaningful documentation and example configuration required by this phase.

Populate:

```text
docs/architecture/README.md
```

Create concise directory-contract documentation where needed.

Do not fabricate final schemas.

---

### Step 8 — Root README

Create a concise, accurate public-facing README reflecting current pre-release reality.

Do not advertise unimplemented functionality.

---

### Step 9 — CI

Add CI that exercises the canonical repository health checks against Node.js 24.

Add Bun verification only if it is straightforward and grounded.

---

### Step 10 — Package-content inspection

Configure and verify package inclusion/exclusion behavior.

Ensure no private/development artifacts would accidentally ship.

Do not publish.

---

### Step 11 — Full automated verification

Run all applicable required checks.

Resolve failures.

Do not weaken tests, linting or type rules merely to obtain green output unless the rule itself is demonstrably
incorrect and changing it remains within approved scope.

---

### Step 12 — Self-review

Review the complete diff.

Look specifically for:

- overengineering;
- unnecessary dependencies;
- unused abstractions;
- speculative interfaces;
- duplicate code;
- misleading documentation;
- personal data;
- scope creep.

Simplify where possible.

---

### Step 13 — Completion report

Produce the report defined in this plan.

---

### Step 14 — Stop

After the report:

**STOP.**

Do not:

- start Phase 2;
- implement installer behavior;
- configure the real environment;
- install Matt skills;
- install OMX skills;
- install 21st dependencies;
- design the final global AGENTS contract;
- commit;
- push;
- publish.

Wait for owner review.

---

## 57. Phase invariant

The governing constraint for Phase 1 is:

> Build the smallest repository foundation that makes the later architecture safe, reproducible, testable, and
> understandable.

Do not implement tomorrow's features today.
