# AI Config — Phase 4: Core Standards and Skills

**Status:** approved for implementation
**Approved:** 2026-09-06
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-3-CODEX-ADAPTER.md`  
**Phase:** 4 of 10  
**Primary provider:** OpenAI Codex  
**Implementation authority:** no implementation before explicit owner approval  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Implement the first production-quality `ai-config` working contract:

- compact global agent instructions;
- durable core standards;
- native core workflow skills;
- explicit skill invocation policy;
- Codex user-skill installation planning;
- validation that the complete workflow can be installed reproducibly.

Phase 4 defines **how the agent should work**.

It does not yet implement project bootstrap, UI workflows, Claude adaptation, or external skill sources.

---

## 2. Core principle

Keep always-loaded context small.

The runtime model should be:

```text
small global contract
        +
explicit workflow skill
        +
approved project plan/context
        +
supporting evidence when required
```

Do not recreate the previous large OMX-style global instruction file.

---

## 3. Global contract

Create the canonical global contract at:

```text
standards/global-agent-contract.md
```

This file becomes the source content supplied to the Phase 3 Codex adapter for:

```text
$CODEX_HOME/AGENTS.md
```

Target size:

> approximately 20–40 meaningful lines.

It should contain only durable cross-project rules.

Required principles:

1. inspect repository/project instructions before material work;
2. material changes require an approved plan;
3. do not silently resolve material product/architecture/security decisions;
4. establish facts independently before asking the owner;
5. after approval, execute autonomously within scope;
6. do not expand an approved plan silently;
7. verification requires evidence;
8. never commit without explicit owner authorization;
9. one primary agent by default;
10. bounded subagents only when useful;
11. project documentation is durable project memory;
12. global workflow skills are explicitly invoked.

Do not include:

- model names;
- model routing tables;
- OMX modes;
- agent catalogs;
- keyword routers;
- long UI guidance;
- provider-specific paths;
- project-specific rules.

---

## 4. Core standards

Create or replace the current placeholder standards with:

```text
standards/
├── README.md
├── global-agent-contract.md
├── planning.md
├── execution.md
├── verification.md
└── commits.md
```

Standards are concise design authorities for the skills.

They should not become another giant documentation system.

Each standard should describe durable rules, not repeat complete skill procedures.

---

## 5. Core skills

Phase 4 implements these ten native skills:

| Skill                 | Purpose                                  |
|-----------------------|------------------------------------------|
| `aic-research`        | evidence-backed external/domain research |
| `aic-clarify`         | resolve genuine material decisions       |
| `aic-analyze`         | read-only repository analysis            |
| `aic-plan`            | produce an implementation plan           |
| `aic-implement`       | execute an approved plan                 |
| `aic-diagnose`        | establish root cause of a defect         |
| `aic-review`          | read-only implementation/code review     |
| `aic-verify`          | evidence-based verification              |
| `aic-security-review` | focused security review                  |
| `aic-lore-commit`     | explicitly authorized Lore commit        |

The `aic-` prefix is deliberate.

It avoids collisions with Codex system/plugin/user skills and makes ownership obvious.

Do not create aliases such as `plan`, `review`, or `commit` in Phase 4.

---

## 6. Skill format

Canonical skill location:

```text
skills/<skill-name>/
├── SKILL.md
└── agents/
    └── openai.yaml
```

`SKILL.md` must remain portable and use minimal standard frontmatter:

```yaml
---
name: aic-plan
description: ...
---
```

Do not put Codex-specific invocation policy in `SKILL.md`.

Codex-specific metadata belongs in:

```text
agents/openai.yaml
```

---

## 7. Explicit invocation

All ten Phase 4 workflow skills are **manual-only** in Codex.

Every skill must contain:

```yaml
policy:
  allow_implicit_invocation: false
```

in `agents/openai.yaml`.

Explicit Codex invocation therefore looks like:

```text
$aic-plan
$aic-implement
$aic-verify
```

No Phase 4 workflow should activate merely because natural-language keywords matched its description.

---

## 8. Skill metadata

Each `agents/openai.yaml` should contain only useful metadata:

```yaml
interface:
  display_name: "..."
  short_description: "..."
  default_prompt: "Use $aic-... to ..."
policy:
  allow_implicit_invocation: false
```

Do not add:

- icons;
- colors;
- MCP dependencies;
- product restrictions;
- speculative metadata.

`default_prompt` must explicitly name the corresponding `$aic-*` skill.

---

## 9. Skill contracts

### `aic-research`

Evidence-first research.

Rules:

- establish research question and scope;
- prefer primary/current sources;
- distinguish fact from inference;
- cite evidence;
- do not implement code;
- create `docs/research/` artifact only when durable research output is requested/useful.

### `aic-clarify`

Decision-resolution workflow.

Rules:

- inspect/research anything the agent can answer independently first;
- ask only questions requiring owner judgment;
- present recommendation, alternatives and trade-offs;
- do not implement.

### `aic-analyze`

Read-only repository investigation.

Rules:

- inspect code/config/tests/history where relevant;
- explain current state and dependencies;
- do not modify repository.

### `aic-plan`

Planning workflow.

Rules:

- inspect current state first;
- resolve facts before asking questions;
- capture scope, decisions, implementation sequence, tests, risks and open decisions;
- material open decisions block implementation;
- plan status remains draft until owner approval;
- do not implement.

### `aic-implement`

Approved-plan execution.

Requirements before mutation:

```text
approved plan exists
AND
status = approved for implementation
AND
no material open decisions
```

Then:

- execute autonomously;
- stay inside approved scope;
- run required automated checks;
- stop for material new decisions;
- never commit.

### `aic-diagnose`

Root-cause analysis.

Rules:

- reproduce where practical;
- distinguish symptoms from root cause;
- collect evidence;
- recommend next action;
- no persistent product/code fix.

### `aic-review`

Read-only review.

Report:

- concrete findings;
- severity;
- evidence/location;
- impact;
- recommended correction.

Do not modify code.

### `aic-verify`

Read-only final verification.

Rules:

- derive checks from the approved plan/definition of done;
- run applicable tests/build/typecheck/lint/runtime checks;
- report exact evidence;
- do not fix failures silently;
- failed verification returns work to implementation.

### `aic-security-review`

Focused read-only security analysis.

Cover only relevant attack surfaces.

Report evidence, impact and recommendation.

Do not turn every review into a generic security checklist.

### `aic-lore-commit`

Git mutation is allowed only because the skill was explicitly invoked for a commit.

Rules:

- inspect status/diff;
- stage only intended scope;
- preserve intent, constraints, rejected approaches and verification;
- validate Lore;
- create one coherent commit;
- never push/tag/release unless separately authorized.

---

## 10. Skill size discipline

Skills must remain compact.

A skill should contain:

```text
purpose
preconditions
procedure
stop conditions
required output
verification
```

not essays explaining agent theory.

Prefer roughly 50–120 lines per `SKILL.md`.

Use supporting references only if a skill genuinely cannot remain clear without them.

Do not create reference files merely to make the directory look complete.

---

## 11. Codex user-skill destination

Phase 4 targets the current Codex user-skill discovery location:

```text
$HOME/.agents/skills/<skill-name>/
```

`ai-config` canonical files remain in:

```text
skills/<skill-name>/
```

The Codex installer representation copies the canonical files into the user skill root.

Do not use:

```text
$CODEX_HOME/skills
.codex/skills
```

for the native Phase 4 library.

---

## 12. Installation architecture

Use the existing Phase 2 installer.

For Codex skills, plan managed regular-file artifacts for:

```text
$HOME/.agents/skills/<name>/SKILL.md
$HOME/.agents/skills/<name>/agents/openai.yaml
```

Use an allowed root that safely permits creation of the `.agents/skills` hierarchy without broad filesystem ownership.

Do not introduce:

- symlink-based installation;
- recursive directory ownership;
- custom backup logic;
- custom rollback logic.

Existing unmanaged skill files must conflict.

Managed skill updates use Phase 2 replacement semantics.

---

## 13. Canonical skill catalog

Implement a small static catalog for the ten native skills.

The catalog should provide enough information to:

- locate packaged canonical skill assets;
- validate expected files;
- produce Codex desired artifacts.

Do not build the external-source registry here.

Do not build a generic plugin marketplace.

External skills belong to Phase 7.

---

## 14. Package assets

Phase 4 makes standards and native skills real runtime assets.

Update package-content rules so the package can include the required canonical:

```text
standards/
skills/
```

assets in addition to the executable runtime.

`npm run pack:check` must verify that only intended canonical assets are added.

Do not package tests or planning documents merely because the package now contains skills.

---

## 15. Core workflow planning

Implement an internal Codex core-workflow planner that composes:

```text
Phase 3 global AGENTS planning
+
Phase 4 native skill planning
```

It may return separate underlying installer plans if that keeps the design simpler.

Do not create a generic multi-provider orchestration framework.

The result must clearly indicate whether the **whole Codex core workflow** is applicable.

For example, an active `AGENTS.override.md` makes the overall core workflow not ready even if skill files themselves
could be installed.

---

## 16. No real environment migration

Automated tests must use:

```text
temporary HOME
temporary CODEX_HOME
temporary ai-config stateDir
fake/injected Codex detection
```

Do not modify the user's real:

```text
~/.codex
~/.agents/skills
~/.ai-config
```

Actual migration remains Phase 9.

---

## 17. Validation

Add deterministic validation for the native skill catalog.

At minimum verify:

- exactly the expected ten skills exist;
- skill directory name matches frontmatter `name`;
- every skill has a non-empty `description`;
- every skill has `agents/openai.yaml`;
- every Codex metadata file sets `allow_implicit_invocation: false`;
- every `default_prompt` references the correct `$aic-*` name;
- no duplicate skill names;
- no TODO/placeholders;
- no absolute personal paths;
- files remain within a reasonable size budget.

Avoid a complicated generic YAML/schema framework.

Use the smallest maintained parsing approach already available or a narrowly scoped validator.

Do not add a production dependency just for development validation.

---

## 18. Required integration tests

At minimum cover:

```text
fresh global AGENTS + ten skills
→ installable in isolated Codex environment

repeat plan
→ NOOP / converged

managed skill content update
→ replacement

existing unmanaged skill
→ conflict

skill metadata drift
→ conflict

active AGENTS.override.md
→ whole workflow not ready

config.toml
→ untouched

no skills outside $HOME/.agents/skills

no real HOME access

global contract installed through Phase 3

all ten skills installed with explicit-only metadata
```

Existing Phase 1–3 tests must remain green.

---

## 19. Documentation

Create one concise durable document:

```text
docs/architecture/core-workflow.md
```

Document:

- global contract role;
- standards vs skills;
- explicit invocation;
- skill naming;
- core workflow sequence;
- mutation/read-only boundaries.

Update:

```text
docs/providers/codex.md
```

only with current implemented Codex user-skill facts.

Do not duplicate this plan.

---

## 20. External sources explicitly deferred

Do not import or adapt in Phase 4:

- Matt Pocock skills;
- OMX skills;
- 21st skills;
- third-party skill packages.

Phase 4 skills are native `ai-config` contracts.

External comparison/adaptation belongs to Phase 7, where provenance, pinning and licensing are implemented correctly.

---

## 21. Explicitly outside Phase 4

Do not implement:

- `bootstrap-project` — Phase 5;
- Claude adapter — Phase 6;
- external source manager — Phase 7;
- UI/product-design skill bundle — Phase 8;
- current-workstation migration — Phase 9;
- public release/setup UX — Phase 10;
- model routing;
- automatic workflow routing;
- generic provider capability matrix;
- skill deletion;
- external skill updates.

---

## 22. Definition of Done

Phase 4 is complete when:

- compact global contract exists;
- five core standards exist and remain concise;
- ten native skills exist;
- all ten use `aic-*` names;
- all ten are explicit-only in Codex;
- canonical skills validate;
- canonical global contract can be delivered through Phase 3;
- canonical skills can be planned through Phase 2 into `$HOME/.agents/skills`;
- unmanaged/drifted skill content is preserved;
- isolated full core workflow converges;
- repeat planning produces no changes;
- config.toml remains untouched;
- no external skills/packages are introduced;
- package contains required runtime assets only;
- existing Phase 1–3 tests pass;
- no real AI environment is modified;
- owner manual QA passes;
- no material open decision blocks Phase 5.

---

## 23. Approved decisions

Approval of this plan approves:

1. global contract target size: approximately 20–40 lines;
2. five concise standards;
3. ten native core workflow skills;
4. `aic-` namespace for Phase 4 skills;
5. all Phase 4 skills explicit-only;
6. user-skill installation under `$HOME/.agents/skills`;
7. no skill aliases;
8. no external/vendored skills yet;
9. no generic provider-skill framework yet;
10. no real workstation migration.

---

## 24. Implementation sequence

1. Inspect Master Architecture, Phase 2/3 architecture and approved Phase 4 plan.
2. Reconfirm current Codex user-skill path and invocation metadata from primary OpenAI sources.
3. Write the compact global contract and standards.
4. Implement the ten native skill directories.
5. Add deterministic skill validation.
6. Implement the static native skill catalog.
7. Implement Codex native-skill planning using Phase 2.
8. Compose it with Phase 3 global-instruction planning.
9. Add isolated integration tests.
10. Update package asset rules.
11. Add concise architecture/provider documentation.
12. Run full verification and focused self-review.
13. Report results.
14. STOP — no commit, no Phase 5, no real environment mutation.

---

## 25. Required completion report

Return:

### Status

`COMPLETE — awaiting manual verification`

or:

`BLOCKED — owner decision required`

### Files created / modified

Exact paths, grouped concisely.

### Global contract

State its size and the durable invariants encoded.

### Standards

List the five standards and their responsibilities.

### Skills

For each of the ten skills give:

```text
name
mutation policy
one-sentence responsibility
```

### Codex representation

Report:

```text
user skill root
metadata format
implicit invocation policy
```

### Installation model

Explain how Phase 2/3 are reused.

### Package contents

State what new runtime assets are included.

### Verification

Exact commands + PASS/FAIL and test counts.

### Security/scope review

Confirm:

- no real HOME mutation;
- no config.toml mutation;
- no external skills;
- no implicit workflows.

### Known gaps

If none:

`None.`

### Deviations

If none:

`None.`

### Open decisions before Phase 5

If none:

`None.`

### Commit

End exactly:

`No commit created. Awaiting explicit owner instruction.`

---

## Phase invariant

> **The global contract defines the rules; skills provide the workflows; neither should become a framework.**
