# AI Config — Master Architecture v1

**Status:** approved architecture — implementation baseline  
**Approved:** 2026-09-01  
**Primary target:** macOS  
**Runtime baseline:** Node.js 24  
**Development package manager:** npm  
**Repository license:** MIT  
**First-class provider:** OpenAI Codex  
**Required secondary provider:** Claude Code  
**Repository:** public  
**Distribution:** npm package executable through `npx` and `bunx`

---

# 1. Product definition

`ai-config` is a provider-neutral configuration manager for AI coding-agent environments.

Its purpose is to make a new development machine reproducibly match the owner's preferred AI-agent environment without manually copying:

- global instructions;
- skills;
- standards;
- provider configuration;
- helper tooling;
- selected third-party capabilities;
- project bootstrap templates.

The intended end-user experience is:

```bash
npx <package-name> setup
```

or:

```bash
bunx <package-name> setup
```

followed by a globally configured and verified AI coding environment.

`ai-config` is not an agent orchestrator.

It must not become another Oh My Codex.

It configures and composes existing agent platforms and capabilities while leaving actual task execution to those platforms.

---

# 2. Governing architecture invariant

The governing principle of the project is:

> **AI Config manages a predictable agent environment; it does not own the agents' execution.**

Providers execute work.

Skills define reusable working disciplines.

Standards define durable engineering rules.

Project documents preserve durable project knowledge.

Plans define authorized change.

Provider adapters translate canonical configuration into provider-specific representations.

`ai-config` makes these pieces reproducible across machines.

---

# 3. Non-goals

`ai-config` v1 is not intended to provide:

- its own multi-agent runtime;
- tmux worker orchestration;
- persistent agent workers;
- a general workflow engine;
- an agent memory database;
- an issue tracker;
- cloud synchronization;
- a graphical interface;
- automatic model-selection infrastructure;
- a generic public plugin marketplace;
- arbitrary execution of third-party scripts;
- uncontrolled upstream updates;
- first-class Windows support;
- first-class Linux support;
- multiple configuration profiles.

These capabilities may only be reconsidered after real usage demonstrates a clear need.

---

# 4. Provider neutrality

The canonical configuration must not depend on Codex-specific implementation details.

Conceptually:

```text
                    AI CONFIG CORE

          standards / skills / policies
            templates / dependencies
                     sources
                       │
        ┌──────────────┼──────────────┐
        │              │              │
      Codex          Claude         future
     adapter         adapter        adapter
```

Codex is the first and most thoroughly supported provider.

Claude Code is a required secondary provider.

Future providers must be addable through adapters without redesigning the core configuration model.

---

# 5. Canonical configuration

The `ai-config` repository is the canonical source of truth.

Canonical assets include:

```text
standards/
skills/
templates/
config/
upstream/
```

Provider-specific installed files such as:

```text
~/.codex/...
~/.claude/...
```

are generated or synchronized deployment artifacts.

Installed provider configuration must never become the canonical source from which `ai-config` is reconstructed.

---

# 6. Global configuration vs project configuration

The architecture distinguishes two scopes.

## Global scope

Global configuration defines reusable behavior that should apply across projects.

Examples:

- planning discipline;
- execution gates;
- verification expectations;
- commit policy;
- reusable skills;
- provider configuration;
- provider-independent engineering standards.

Global configuration must remain compact.

It must not contain product-specific facts.

## Project scope

Every repository may define additional instructions and durable knowledge.

Typical project-level artifacts include:

```text
AGENTS.md
CONTEXT.md
ARCHITECTURE.md
DESIGN.md
docs/
```

Project configuration extends or specializes global standards.

Project-specific constraints take precedence where explicitly intended, while global safety and approval invariants remain authoritative unless deliberately changed by the owner.

---

# 7. Standing-context minimization

A primary architectural goal is to minimize instructions that are loaded into every agent interaction.

The intended model is:

```text
small global contract
        +
progressively loaded skills
        +
concise project instructions
        +
task-specific plan
        +
specialized references when needed
```

Do not replace the current large OMX global configuration with another equally large monolithic `AGENTS.md`.

Detailed workflow knowledge belongs in skills and standards loaded only when relevant.

---

# 8. Explicit workflow control

Large workflow skills are explicitly invoked by the user.

Normal natural-language messages must not silently trigger heavyweight execution modes because a keyword happens to match.

The architecture distinguishes:

```text
user-invoked workflow skills
model-invoked supporting skills
```

User-invoked workflow skills include processes where choosing the workflow itself is a meaningful operator decision.

Supporting skills may be model-invoked only when their specification explicitly permits it and doing so cannot bypass approval gates.

Provider adapters must preserve this semantic distinction even when providers represent invocation policy differently.

---

# 9. Plan-before-change rule

Every material code, architecture, product or UI change requires a written plan before implementation.

Material changes include:

```text
new features
architecture changes
behavior changes
meaningful refactors
UI redesigns
data-model changes
API-contract changes
security-sensitive changes
meaningful dependency changes
migrations
```

The plan is an execution contract.

Implementation may begin only after explicit owner approval.

---

# 10. Plan artifact contract

A material implementation plan must contain enough information for an implementation agent to execute autonomously without reopening product decisions.

At minimum:

```text
Goal
Current state
Requirements
Confirmed decisions
Constraints
Out of scope
Affected areas/files
Implementation sequence
Data/API impact
Testing strategy
Manual verification requirements
Security considerations where applicable
Risks
Rollback/recovery
Definition of done
Open decisions
```

A material unresolved item under:

```text
Open decisions
```

blocks implementation.

---

# 11. Never guess material decisions

An agent must not silently resolve uncertainty that materially affects:

- product behavior;
- UX;
- architecture;
- security;
- data;
- APIs;
- external integrations;
- scope;
- irreversible actions.

When such uncertainty exists, the agent must first establish all facts it can independently verify.

If a decision still remains, it must present:

```text
options
recommendation
reasoning
trade-offs
required decision
```

and wait for owner resolution.

Routine implementation details that remain inside the approved intent and architecture do not require approval.

---

# 12. Autonomous implementation

Once a plan has been approved, implementation should be autonomous.

The implementation agent should:

```text
read approved plan
inspect current repository state
execute approved steps
remain inside approved scope
run required automated verification
fix recoverable implementation failures
collect completion evidence
```

It should not repeatedly ask permission for obvious, reversible steps already authorized by the plan.

Autonomy begins after plan approval, not before it.

---

# 13. Implementation contract

The canonical implementation discipline is:

```text
read the approved plan
inspect current repository state
do not redesign the feature
do not silently expand scope
do not resolve material open decisions
implement autonomously
run automated checks required by the plan
review the resulting diff
stop at required human gates
never commit automatically
```

If implementation uncovers information that invalidates an approved material assumption, the affected work branch stops and returns to planning/decision resolution.

---

# 14. Human approval gates

The agent must stop for:

```text
unresolved material decisions
destructive or irreversible operations
manual QA explicitly required by the plan
manual visual acceptance explicitly required by the plan
external publication
releases
commits
credential/account actions requiring the owner
material architecture changes outside the approved plan
```

The existence of an approval gate must not prevent autonomous execution of unrelated approved work.

---

# 15. Commit ownership

Agents never commit simply because implementation has finished.

A Git commit requires explicit owner instruction.

Commit creation follows the Lore protocol.

Commit context should preserve, where applicable:

- intent;
- relevant constraints;
- rejected alternatives;
- confidence;
- scope risk;
- forward-looking directives;
- verification performed;
- known verification gaps.

The commit workflow is a separate user-invoked action.

---

# 16. Verification contract

Verification is evidence-based.

An agent cannot declare work complete because the result appears correct or because the model has high confidence.

For every required success condition, the agent must identify and execute an appropriate proof.

Evidence may include:

```text
unit tests
integration tests
typecheck
lint
build
static analysis
runtime smoke checks
API integration checks
browser verification
visual comparison
security review
manual QA
```

Only relevant checks should run.

The approved plan determines the required verification set.

---

# 17. Manual verification

Manual verification is used only when machine-verifiable evidence is insufficient.

Examples:

- subjective visual acceptance;
- interaction quality that automated checks cannot establish;
- real account/provider behavior that cannot safely be reproduced;
- owner-facing product decisions.

The implementation report must tell the owner exactly what requires manual verification.

A manual gate does not implicitly authorize a commit.

---

# 18. Single-agent-first execution model

The default execution model is:

> **one strong primary agent**

Native subagents may be used occasionally for bounded independent work where they materially improve:

- speed;
- evidence quality;
- review independence;
- research coverage.

Typical useful subagent tasks:

```text
repository exploration
external research
independent code review
security review
isolated test analysis
```

Do not create large agent teams for routine work.

---

# 19. OMX position

Oh My Codex is not the default governing framework of `ai-config`.

Selected OMX capabilities may be:

```text
used externally
vendored
adapted
or omitted
```

depending on their value and compatibility with `ai-config` principles.

Full OMX may remain an optional advanced dependency when durable orchestration provides unique value, such as:

- persistent tmux workers;
- coordinated worktrees;
- durable shared task state;
- long-running multi-agent execution.

Normal work should rely on native provider execution and native subagents where sufficient.

---

# 20. Runtime baseline

The v1 runtime baseline is:

> **Node.js 24**

The core CLI is written in TypeScript.

The implementation must use APIs compatible with Node.js 24 and, where practical, Bun.

Runtime support must be maintained centrally rather than encoded inside individual skills.

Future runtime baseline changes must not require rewriting skills or provider-independent standards.

---

# 21. Development package manager

The canonical development package manager is:

> **npm**

Use:

```text
package-lock.json
```

as the dependency lockfile.

Bun compatibility is an execution/distribution requirement, not a requirement to use Bun as the repository package manager.

Do not maintain competing npm and Bun lockfiles in v1.

---

# 22. Distribution

The project is distributed as an npm package.

The intended user surfaces are:

```bash
npx <package-name> setup
```

and:

```bash
bunx <package-name> setup
```

The final npm package name is intentionally deferred until the release phase.

---

# 23. `npx` / `bunx` runtime strategy

The package must not maintain separate Node and Bun applications.

Both invocation surfaces must execute the same application logic.

The launcher layer may select an available compatible runtime when required.

Conceptually:

```text
package executable
       │
       ▼
portable launcher
       │
       ├── compatible Node available → execute application
       │
       ├── compatible Bun available  → execute application
       │
       └── neither                    → clear actionable error
```

The launcher must remain minimal.

Provider-management business logic must not live inside the launcher.

Runtime compatibility must be tested rather than inferred.

---

# 24. Repository license

`ai-config` uses the:

> **MIT License**

The public repository contains a standard MIT `LICENSE` file.

Third-party materials retain their upstream attribution and licensing obligations.

The repository's own license never overrides third-party license requirements.

---

# 25. Public repository requirement

The repository is public by design.

Therefore source-controlled content must never contain:

```text
credentials
API keys
tokens
passwords
private machine identifiers
personal absolute filesystem paths
private repository references
private service URLs
generated local state
```

All filesystem behavior must use environment-independent path resolution.

---

# 26. Package installation safety

Installing or downloading the npm package itself must not modify the user's AI environment.

For example:

```bash
npm install <package-name>
```

must be side-effect free with respect to provider configuration.

Do not use npm lifecycle hooks such as:

```text
preinstall
install
postinstall
```

to configure the user's machine.

Environment mutation may occur only after an explicit command such as:

```bash
ai-config setup
```

This is a hard safety invariant.

---

# 27. Installation state

Installer-specific state belongs under:

```text
~/.ai-config/
```

Conceptually:

```text
~/.ai-config/
├── state.json
├── lock.json
├── backups/
├── cache/
├── receipts/
└── logs/
```

This directory stores installation-management data only.

It must not become a competing source of project knowledge.

Project knowledge remains inside project repositories.

---

# 28. Ownership model

Every artifact managed in an external provider configuration requires explicit ownership semantics.

The canonical states are:

```text
managed
adopted
unmanaged
```

## Managed

The complete artifact is owned by `ai-config`.

Compatible updates may replace it.

## Adopted

Only explicitly identified sections or structures are controlled by `ai-config`.

User-owned content outside those regions must survive updates.

## Unmanaged

Existing content is not owned by `ai-config`.

It cannot be silently overwritten.

Unknown ownership always defaults toward preservation.

---

# 29. Managed regions

Where text-based partial ownership is appropriate, managed regions may use markers such as:

```text
<!-- AI-CONFIG:START -->
...
<!-- AI-CONFIG:END -->
```

Only content inside the managed region may be replaced automatically.

Where provider configuration uses structured formats, prefer format-aware modification over text markers.

Never use broad text replacement when a structured mutation can preserve user-owned content more safely.

---

# 30. Setup transaction

`setup` must eventually behave transactionally.

Conceptually:

```text
detect environment
        ↓
inspect existing configuration
        ↓
resolve desired manifest
        ↓
produce installation plan
        ↓
backup affected existing state
        ↓
apply changes
        ↓
verify resulting environment
        ↓
write installation receipt
```

A partially failed installation must not silently leave the machine in an unknown state.

Where technically feasible, failed transactions restore the previous known state.

---

# 31. Dry-run requirement

Broad or destructive configuration operations must support dry-run behavior.

Target surfaces include:

```bash
ai-config setup --dry-run
ai-config update --dry-run
```

Dry run reports intended actions such as:

```text
create
modify
adopt
leave untouched
install dependency
configure provider
remove obsolete managed artifact
```

without changing the machine.

---

# 32. Drift detection

Managed installed artifacts should be recorded in installation receipts with sufficient identity information to detect drift.

The system should eventually distinguish:

```text
unchanged managed artifact
locally modified managed artifact
missing managed artifact
unexpected replacement
obsolete managed artifact
```

Local modifications must never be silently destroyed.

Detected drift should result in a clear decision or conflict path.

---

# 33. Backup and rollback

Before changing existing managed or adopted configuration, `ai-config` preserves the previous relevant state.

Backups belong conceptually under:

```text
~/.ai-config/backups/<transaction-id>/
```

Every mutation transaction receives an identity and receipt.

Rollback compatibility must be considered in state schemas from the beginning, even if the public `rollback` command is introduced after initial installer functionality.

---

# 34. Doctor behavior

`doctor` diagnoses the current machine against the desired configuration.

It may inspect:

```text
platform
runtime
providers
global instructions
installed skills
dependencies
managed artifacts
drift
configuration validity
```

Example conceptual output:

```text
AI Config

Platform
✓ macOS arm64

Providers
✓ Codex detected
✓ Claude detected

Codex
✓ global instructions managed
✓ expected skills present
✓ configuration valid

Claude
✓ global instructions managed
✓ compatible skills present

Dependencies
✓ runtime available
✓ Git available

Drift
! one managed artifact modified locally
```

`doctor` diagnoses.

It must not silently repair configuration by default.

Repair requires an explicit action.

---

# 35. Provider adapter contract

Provider-specific implementation belongs behind provider adapters.

A provider adapter may eventually support lifecycle operations such as:

```text
detect()
inspect()
planInstall()
install()
verify()
update()
uninstall()
```

The exact interface should remain as small as the implementation requires.

Do not create speculative methods merely because they may someday be useful.

---

# 36. Provider capabilities

Providers may expose different capabilities.

The architecture must be able to represent differences such as:

```text
globalInstructions
projectInstructions
skills
explicitSkillInvocation
implicitSkillInvocation
subagents
MCP or equivalent tool integration
settings
hooks
```

The core must not assume every provider supports every capability.

Unsupported capability must be represented explicitly.

It must never be simulated silently.

---

# 37. Codex adapter

Codex is the first-class implementation target.

The Codex adapter will eventually manage, where applicable:

```text
global AGENTS.md
global skills
project skills
provider configuration
compatible settings
verification of managed artifacts
```

The adapter must respect the configured Codex home location rather than hardcoding a personal filesystem path.

Provider-specific details belong to the Codex adapter, not the core.

---

# 38. Claude adapter

Claude Code is a required secondary provider.

Claude support must be a real adapter rather than a renamed Codex configuration.

The adapter should prefer thin provider-specific entry files that reuse canonical project guidance rather than creating independent copies of the same policies.

The architectural objective is:

```text
one semantic source
       ↓
multiple provider representations
```

not:

```text
independent Codex policy
+
independent Claude policy
+
eventual configuration drift
```

---

# 39. Future provider adapters

Adding another provider should primarily require:

```text
provider detection
provider capability declaration
provider-specific path/configuration mapping
provider-specific skill representation
provider-specific verification
```

It should not require modifying the fundamental planning, execution or verification contracts.

Provider-specific exceptions should remain localized.

---

# 40. Skills architecture

Skills are organized by function, not by original vendor.

There are three primary source classes:

```text
native
vendored/adapted
external-managed
```

---

# 41. Native skills

Native skills are authored and maintained directly by `ai-config`.

Expected examples include:

```text
bootstrap-project
plan
implement
verify
```

These skills define behavior that is sufficiently central to the `ai-config` contract that upstream control would create unacceptable behavioral risk.

---

# 42. Vendored/adapted skills

A vendored/adapted skill originates substantially from another project but is stored and maintained inside `ai-config` because its behavior must be:

- modified;
- constrained;
- made provider-neutral;
- integrated with approval gates;
- stabilized against unexpected upstream changes.

Potential candidates include concepts derived from:

```text
research
clarification/interview workflows
product-design workflows
code review disciplines
```

Every adapted resource must retain provenance and required attribution.

Our local behavioral contract takes precedence over future upstream changes.

---

# 43. External-managed skills

Some external skills may be installed from their upstream source without maintaining a local fork.

This is appropriate only when:

- upstream behavior is intentionally desired unchanged;
- licensing permits use;
- provider compatibility is known;
- version pinning is possible;
- unexpected upstream changes cannot enter normal setup.

External-managed skills must still be declared in the canonical dependency registry.

---

# 44. Upstream dependency registry

Third-party agent resources must be declared through a canonical registry rather than embedded as ad-hoc installer commands.

Registry metadata should eventually cover:

```text
resource identity
resource type
source repository/package
source path
immutable revision/version
license
upstream name
local name
installation mode
provider compatibility
local modifications
update policy
```

The final schema is deliberately deferred until the external-source implementation phase.

---

# 45. Immutable upstream pinning

Normal installation must never pull critical behavior directly from:

```text
main
master
latest
HEAD
```

without an immutable resolution.

External dependencies must resolve to:

- a known immutable package version;
- a verified release/tag resolution;
- an exact commit SHA;
- another equivalently immutable artifact.

A given `ai-config` release should install reproducible behavior.

---

# 46. Upstream update workflow

External updates enter deliberately.

Conceptually:

```text
detect upstream candidate
        ↓
retrieve candidate
        ↓
compare with pinned version
        ↓
license review
        ↓
compatibility review
        ↓
semantic diff
        ↓
adapt local version if necessary
        ↓
automated verification
        ↓
human review
        ↓
new ai-config version
```

End users do not automatically inherit arbitrary upstream changes.

They receive reviewed `ai-config` releases.

---

# 47. Third-party licensing

Third-party licensing is part of dependency metadata.

No third-party artifact may be vendored into the public repository until:

```text
license identified
redistribution rights verified
modification rights verified when required
attribution requirements understood
compatibility accepted
```

Unknown license means:

> **do not vendor**

until resolved.

Vendored third-party material must be represented in an appropriate:

```text
THIRD_PARTY_NOTICES.md
```

or equivalent attribution mechanism.

---

# 48. Package dependency installation

`ai-config` may eventually install supporting packages required by the selected configuration.

Package installation must be declared and planned.

A skill must not gain authority to install arbitrary software merely because its documentation contains shell commands.

Dependency installation belongs to the canonical dependency resolver.

Before installation the system should be able to state:

```text
dependency
required version
why it is needed
whether already installed
intended action
```

---

# 49. Dependency policy

Project runtime dependencies should remain minimal.

Add a dependency only where it materially improves:

- correctness;
- maintainability;
- portability;
- security;
- validation;
- testing.

Do not add dependencies purely for decorative CLI behavior.

Avoid overlapping packages that solve the same responsibility.

Production dependencies deserve greater scrutiny than development tooling.

---

# 50. Core workflow architecture

The canonical working flow is:

```text
research / clarify when required
              ↓
             plan
              ↓
        OWNER APPROVAL
              ↓
          implement
              ↓
    automated verification
              ↓
review / security / visual QA
as required by approved plan
              ↓
      MANUAL QA if required
              ↓
        OWNER APPROVAL
              ↓
            commit
```

This workflow is deliberately simpler and more explicit than a full orchestration framework.

---

# 51. Core skills v1

The target core skill set is:

| Skill | Invocation | Responsibility |
|---|---|---|
| `bootstrap-project` | user | initialize agent-ready project knowledge structure |
| `research` | user / authorized support | evidence-backed research |
| `clarify` | user | resolve material ambiguity |
| `analyze` | user | read-only repository investigation |
| `plan` | user | canonical implementation plan |
| `implement` | user | execute an approved plan only |
| `diagnose` | user | root-cause debugging |
| `review` | user | implementation/code review |
| `verify` | user | evidence-based final verification |
| `security-review` | user | focused security analysis |
| `product-design-lead` | user | product/UI design work |
| `lore-commit` | user only | commit after explicit authorization |

TDD will be evaluated as either:

- a reusable supporting discipline;
- or a standalone skill;

rather than automatically becoming another top-level workflow.

---

# 52. UI extension set

The initial UI/product extension set is expected to retain or adapt:

```text
21st-cli-use
21st-ui-explore
21st-ui-build
21st-ui-review
visual-verdict
```

These skills are extensions.

They are not part of the foundational execution state machine.

UI creation and review must still respect:

```text
plan
approval
implementation
verification
manual gate where required
```

---

# 53. Product-design principles

Product-design workflows should favor:

- product-specific interfaces;
- existing product identity;
- clear information hierarchy;
- established interaction patterns;
- strong typography;
- intentional spacing;
- accessible contrast;
- predictable navigation;
- deliberate reuse;
- responsive behavior;
- clear interaction states.

They should avoid generic AI-generated UI tendencies such as:

- unnecessary card nesting;
- excessive rounding;
- gratuitous gradients;
- unnecessary glass effects;
- decorative badges;
- arbitrary shadows;
- excessive muted text;
- unnecessary dashboards;
- random accent colors;
- animation without product value.

Detailed design guidance belongs in the relevant skill or project `DESIGN.md`, not the global always-loaded contract.

---

# 54. Project bootstrap contract

A new project initialized through `ai-config` should become agent-ready before substantial implementation begins.

The baseline knowledge scaffold is expected to include:

```text
AGENTS.md
CONTEXT.md
ARCHITECTURE.md
DESIGN.md        # when the product has meaningful UI

docs/
├── adr/
├── research/
├── plans/
├── specs/
└── testing/
```

The exact physical scaffold may depend on project type.

---

# 55. No invented project knowledge

Bootstrap templates must not fabricate product or technical facts.

Unknown information must be represented explicitly, for example:

```text
TBD
unresolved
requires research
not yet decided
```

A blank or unresolved fact is preferable to a plausible invention.

---

# 56. Project knowledge responsibilities

## `AGENTS.md`

Repository-specific operating contract and pointers.

It should remain concise.

## `CONTEXT.md`

Product/domain vocabulary, actors, concepts, business rules and durable contextual knowledge.

## `ARCHITECTURE.md`

Current architecture, boundaries, important interfaces and technical invariants.

## `DESIGN.md`

Durable product-interface and visual-system guidance when relevant.

## `docs/adr/`

Architectural or product decisions that should remain discoverable over time, including meaningful rejected alternatives.

## `docs/research/`

Evidence gathered for decisions.

## `docs/plans/`

Approved and historical implementation plans.

## `docs/specs/`

Stable feature specifications when requirements deserve a durable artifact beyond an implementation plan.

## `docs/testing/`

Durable project testing strategy or specialized verification documentation.

---

# 57. Project saturation workflow

A new project should not begin with blind implementation.

The intended high-level sequence is:

```text
bootstrap structure
       ↓
understand project intent
       ↓
research relevant domain/technology
       ↓
resolve material product decisions
       ↓
establish domain/context
       ↓
establish architecture
       ↓
establish design guidance when relevant
       ↓
create implementation plan
       ↓
owner approval
       ↓
implementation
```

The depth of each stage should remain proportional to the project.

Do not create documentation bureaucracy for trivial projects.

---

# 58. Canonical repository architecture

The expected top-level architecture is:

```text
ai-config/
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
├── LICENSE
│
├── src/
│   ├── cli/
│   ├── core/
│   ├── providers/
│   ├── sources/
│   ├── installer/
│   ├── state/
│   └── validation/
│
├── config/
│   ├── manifest/
│   ├── providers/
│   └── dependencies/
│
├── standards/
├── skills/
├── templates/
│   └── project/
├── upstream/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
└── docs/
    ├── architecture/
    ├── plans/
    ├── providers/
    ├── skills/
    ├── migrations/
    └── contributing/
```

Exact directory details may evolve through approved phase plans.

The separation of responsibilities is the architectural invariant.

Do not preserve an inferior directory shape merely because it appears in this diagram if an approved later architecture decision improves it.

---

# 59. Core source boundaries

## `src/cli`

User-facing command parsing and routing.

Must not contain provider-specific installation business logic.

## `src/core`

Provider-neutral domain contracts and configuration-management orchestration.

Must not directly know provider filesystem layouts.

## `src/providers`

Provider-specific detection, representation, path logic and configuration behavior.

## `src/sources`

External-resource source resolution.

## `src/installer`

Filesystem mutation, transaction and application concerns.

Must remain provider-policy neutral where practical.

## `src/state`

Installation receipts, ownership metadata and local installer state.

## `src/validation`

Reusable validation boundaries.

Avoid speculative abstractions without a real caller.

---

# 60. Human-authored vs machine-generated configuration

Use a clear conceptual separation:

```text
human-authored canonical configuration → YAML where appropriate
machine-generated installer state       → JSON where appropriate
```

Exact schemas are implemented only when required by their first real consumer.

Do not design large speculative manifest schemas in advance.

---

# 61. Secrets

`ai-config` must not:

```text
store provider API keys in the repository
copy credentials into its own state unnecessarily
print credentials in logs
commit secrets
invent credential-management infrastructure
```

Provider-native authentication remains provider-owned wherever possible.

`ai-config` may detect whether required authentication exists without taking ownership of the credential.

---

# 62. Test isolation

Tests must never modify the real user environment.

In particular they must not rely on or write to:

```text
~/.ai-config
~/.codex
~/.claude
```

Integration tests use isolated temporary environments and explicit HOME/config resolution.

A test must not pass merely because the developer's workstation already contains the expected tool or configuration.

---

# 63. Dogfooding strategy

The real workstation should not be migrated early.

Development first uses:

```text
temporary HOME
       ↓
simulated provider directories
       ↓
setup
       ↓
verification
       ↓
update
       ↓
intentional drift
       ↓
conflict handling
       ↓
backup/rollback validation
```

Only after these flows are reliable should `ai-config` modify the real active Codex/Claude environment.

---

# 64. Compatibility verification

Provider compatibility must be demonstrated.

For skills this may eventually include verification of:

```text
provider metadata validity
explicit invocation policy
implicit invocation policy
references/assets
required capabilities
unsupported capability handling
provider-specific installed representation
```

A compatibility declaration without evidence is not sufficient for release.

---

# 65. Model-selection policy

Model selection is an operator/runtime concern.

It must not be hardcoded permanently into individual skill instructions.

Skills describe:

> **how a task should be performed**

Model policy determines:

> **how much reasoning capability that task warrants at the current time**

This prevents skill definitions from becoming stale as provider model catalogs change.

---

# 66. Model-efficiency principle

For each meaningful Codex implementation task in the development of `ai-config`, the operator should explicitly recommend:

```text
model
reasoning effort
```

The governing principle is:

> **Use the least expensive model tier that can reliably perform the bounded task. Escalate because of complexity or risk, not simply because a stronger model exists.**

Typical categories:

```text
architecture / high-risk decisions → strongest reasoning tier
complex planning                  → strong reasoning tier
security/auth/migrations          → strong reasoning tier
bounded implementation            → balanced coding tier
routine review                     → balanced tier
repo exploration                   → efficient tier
simple scaffolding/docs            → efficient tier
difficult unresolved debugging     → escalate as required
```

Exact model names belong in current operator guidance, not durable skill contracts.

---

# 67. Prompt-efficiency principle

Prompts should be concise but complete.

Avoid repeatedly injecting:

- full architecture;
- full workflow definitions;
- unused agent catalogs;
- model tables;
- unrelated skills;
- provider documentation irrelevant to the task.

Instead use references such as:

```text
read Master Architecture
read approved Phase Plan
read relevant standard
read relevant skill
execute assigned scope
```

This makes the repository itself durable context and reduces prompt duplication.

---

# 68. Code-quality principles

Implementation should prefer:

- minimal dependencies;
- small cohesive modules;
- explicit boundaries;
- simple data structures;
- typed contracts;
- testable pure logic;
- clear separation of side effects;
- standard platform APIs;
- deletion over unnecessary abstraction.

Avoid:

- speculative plugin frameworks;
- generic factories without need;
- unnecessary base classes;
- dependency-injection frameworks without demonstrated value;
- catch-all utility modules;
- duplicate models;
- wrapper layers around trivial APIs;
- abstraction created only for theoretical future providers.

Extensibility should emerge through real adapter and source boundaries, not architecture theater.

---

# 69. Anti-slop principle

AI-generated code must not accumulate unnecessary structure merely because generation is cheap.

Review should actively detect:

- duplicated logic;
- dead code;
- unnecessary wrappers;
- weak module boundaries;
- speculative abstractions;
- redundant comments;
- unnecessary dependencies;
- placeholder interfaces;
- inconsistent naming;
- fake extensibility.

Cleanup must preserve behavior and remain inside an approved scope.

---

# 70. Update architecture

The intended stable CLI surface for v1 is approximately:

```bash
ai-config setup
ai-config update
ai-config status
ai-config doctor
ai-config project init
```

Additional commands such as:

```text
diff
rollback
provider add
skill add
```

should only ship after the corresponding use case is validated.

Avoid a large command surface merely because it is easy to create.

---

# 71. Idempotence

Repeated setup should converge on the same intended environment.

Running:

```bash
ai-config setup
```

multiple times without source/configuration changes must not continually mutate managed files.

Idempotence is a release requirement.

---

# 72. Update safety

Running:

```bash
ai-config update
```

must not silently destroy:

- unmanaged configuration;
- locally modified managed content;
- unknown user customizations.

Updates must understand ownership and drift before mutation.

Conflicts should be surfaced explicitly.

---

# 73. Source reproducibility

A released version of `ai-config` should resolve the same reviewed third-party behavior regardless of when setup is executed.

Reproducibility relies on:

- package lockfiles;
- pinned upstream versions/revisions;
- controlled local adaptations;
- reviewable dependency updates.

The system should not behave differently because an upstream repository changed after an `ai-config` release.

---

# 74. Release safety

Before public v1 release, verify at minimum:

```text
no personal absolute paths
no credentials
no private repository references
third-party notices complete
reproducible dependency lock
supported runtime verification
macOS installation test
clean-machine/isolated-HOME test
setup idempotence
update behavior
drift handling
backup/restore behavior
Codex verification
Claude verification
npx execution
bunx execution
package-content inspection
```

Publication itself requires explicit owner authorization.

---

# 75. Implementation phases

The project is divided into controlled implementation phases.

| Phase | Outcome |
|---|---|
| **0 — architecture** | approved Master Architecture |
| **1 — repository foundation** | package, tooling, tests, source boundaries, documentation baseline |
| **2 — installer core** | detection, ownership, transaction, state and dry-run primitives |
| **3 — Codex adapter** | reproducible Codex global configuration |
| **4 — core standards + skills** | canonical working model operational in Codex |
| **5 — project bootstrap** | agent-ready project initialization and knowledge scaffold |
| **6 — Claude adapter** | equivalent semantic environment for Claude Code |
| **7 — external source manager** | pinned Matt/OMX/other dependencies and provenance |
| **8 — UI extension bundle** | reviewed 21st/product-design/visual workflows |
| **9 — migration and dogfooding** | controlled replacement of the existing local OMX-heavy environment |
| **10 — public release** | package publication, release documentation and final verification |

Every phase receives its own approved implementation plan before code changes begin.

---

# 76. Phase-plan authority

The Master Architecture defines durable project-wide decisions.

Phase plans define authorized implementation details for one bounded phase.

Priority:

```text
owner decision
      ↓
Master Architecture
      ↓
approved Phase Plan
      ↓
implementation details
```

A phase plan may refine architecture.

It may not silently contradict it.

If implementation evidence demonstrates that the Master Architecture should change, update the architecture through an explicit owner-approved decision before relying on the new rule.

---

# 77. Scope discipline

Implementation must not automatically continue into the next phase.

When an approved phase is complete:

```text
verify
self-review
produce completion report
request required manual verification
STOP
```

No later-phase work occurs until a new plan is approved.

---

# 78. Public v1 success criteria

`ai-config v1` is successful when a clean supported macOS environment can use either:

```bash
npx <package-name> setup
```

or:

```bash
bunx <package-name> setup
```

to obtain a verified, reproducible supported AI-agent environment.

For v1:

- Codex is first-class;
- Claude Code is supported through its adapter;
- canonical standards are shared semantically across providers;
- compatible skills are installed correctly;
- setup is idempotent;
- updates preserve unmanaged/local content;
- dependencies are pinned;
- third-party provenance is known;
- third-party licensing is handled;
- project bootstrap creates an agent-ready knowledge scaffold;
- no normal workflow depends on the full OMX runtime.

The default change workflow enforces:

```text
plan
→ owner approval
→ autonomous implementation
→ evidence-based verification
→ manual gate when required
→ owner approval
→ explicit Lore commit
```

---

# 79. Architecture evolution

This document is the approved v1 implementation baseline.

It is not immutable forever.

Changes are allowed when real implementation or dogfooding evidence demonstrates a better architecture.

Architecture changes must:

1. identify the problem;
2. establish evidence;
3. describe affected invariants;
4. compare relevant alternatives;
5. provide a recommendation;
6. receive owner approval;
7. update this document or create a superseding version;
8. only then drive implementation.

Do not allow implementation convenience alone to silently rewrite architecture.

---

# 80. Final architecture invariant

The project should remain understandable as:

```text
                 AI CONFIG

       canonical standards + skills
                  +
          project templates
                  +
       reviewed dependencies
                  +
           provider adapters
                  +
        safe configuration CLI

                  ↓

        Codex / Claude / future
```

Not as:

```text
another agent framework
        +
another workflow runtime
        +
another memory system
        +
another orchestration layer
```

The goal is controlled composition, reproducibility and predictable agent behavior.

**AI Config manages the environment. Providers do the work.**
