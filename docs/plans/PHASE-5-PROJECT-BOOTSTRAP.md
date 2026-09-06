# AI Config — Phase 5: Project Bootstrap

**Status:** approved for implementation
**Approved:** 2026-09-06
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-4-CORE-STANDARDS-AND-SKILLS.md`  
**Phase:** 5 of 10  
**Implementation authority:** no implementation before explicit owner approval  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Implement a lean project-bootstrap workflow that turns a new or existing repository into an agent-friendly project
without inventing project facts or overwriting existing knowledge.

Phase 5 adds:

- canonical project scaffold templates;
- explicit `$aic-bootstrap-project` skill;
- safe create/preserve/conflict semantics;
- project-document conventions;
- package/runtime assets required by the bootstrap workflow;
- validation and tests for the scaffold.

Phase 5 does not initialize product code or start implementation.

---

## 2. Bootstrap outcome

The canonical project scaffold is:

```text
AGENTS.md
CONTEXT.md
ARCHITECTURE.md
DESIGN.md          # only when UI relevance is established

docs/
└── README.md
```

`docs/README.md` documents the logical durable-artifact areas:

```text
docs/adr/
docs/research/
docs/plans/
docs/specs/
docs/testing/
```

These subdirectories are created lazily when their first real artifact is needed.

Do not add `.gitkeep` files or five placeholder README files merely to preserve empty directories in Git.

---

## 3. Project ownership

Bootstrap-created project files become **repository-owned immediately after creation**.

They are not long-term `ai-config` managed artifacts.

Therefore:

```text
CONTEXT.md
ARCHITECTURE.md
DESIGN.md
AGENTS.md
docs/README.md
```

must not be recorded in central Phase 2 installer ownership state.

Normal future edits to project knowledge are expected and must not become installer drift.

This is a hard Phase 5 decision.

---

## 4. Bootstrap execution surface

Phase 5 adds one native explicit-only skill:

```text
aic-bootstrap-project
```

Canonical structure:

```text
skills/aic-bootstrap-project/
├── SKILL.md
└── agents/
    └── openai.yaml
```

Codex metadata must include:

```yaml
policy:
  allow_implicit_invocation: false
```

No implicit project bootstrap.

---

## 5. No public bootstrap CLI yet

Phase 5 does not expose:

```bash
ai-config project init
```

as a production CLI command.

The explicit agent skill is the Phase 5 execution surface.

A future CLI can reuse the same canonical templates and semantics once public orchestration is implemented.

Do not create a separate runtime framework merely to duplicate what the agent can already perform safely.

---

## 6. Bootstrap skill contract

`aic-bootstrap-project` may create repository scaffold files.

Before mutation it must:

1. identify the intended repository root;
2. inspect existing scaffold paths;
3. determine the required scaffold;
4. classify every path as:
  - `CREATE`
  - `PRESERVE`
  - `CONFLICT`
  - `SKIP`
5. establish whether the user requested actual initialization or only a preview.

If the user explicitly asked to bootstrap/initialize the repository and there are no material conflicts, that request is
sufficient authorization to apply the bounded scaffold.

Do not ask for a second confirmation merely because files will be created.

If invocation requested only inspection/preview, do not mutate.

---

## 7. Existing content preservation

For every canonical project path:

### Missing

```text
→ CREATE
```

from the canonical template.

### Existing regular file

```text
→ PRESERVE
```

Do not rewrite, merge, normalize, or adopt it automatically.

### Existing symlink or unsupported filesystem object

```text
→ CONFLICT
```

No bootstrap mutation begins while an unsafe structural conflict exists.

Unknown user content always wins over template convenience.

---

## 8. Existing repositories

Bootstrap must work with repositories that already contain project documentation.

It may create only missing canonical files.

Examples:

```text
existing AGENTS.md
missing CONTEXT.md
missing ARCHITECTURE.md
```

results in:

```text
AGENTS.md       → PRESERVE
CONTEXT.md      → CREATE
ARCHITECTURE.md → CREATE
```

Do not alter the existing AGENTS file to add ai-config pointers automatically.

Report any useful recommended follow-up separately.

---

## 9. Repository root

The skill must operate against a clearly identified project root.

For a Git repository, prefer the actual Git worktree root.

Do not:

- initialize Git automatically;
- change branches;
- create commits;
- infer an unrelated parent directory as the project root.

For a non-Git project, use only the directory clearly identified by the user/current task.

---

## 10. Root AGENTS.md

The canonical root `AGENTS.md` template must stay small.

Its purpose is repository navigation, not repetition of the global contract.

It should point agents to:

```text
CONTEXT.md
ARCHITECTURE.md
DESIGN.md when present
docs/README.md
```

and establish:

- read only documentation relevant to the task;
- do not invent missing project facts;
- represent unknown information explicitly;
- store material plans/research in the documented durable locations.

Do not copy the global agent contract into project `AGENTS.md`.

---

## 11. Nested instructions

Phase 5 creates only the root project `AGENTS.md`.

It must not:

- create nested `AGENTS.md` files automatically;
- replace existing nested instructions;
- scan the entire repository merely to normalize nested instructions.

Nested instructions are created later only when a real subtree requires local rules.

---

## 12. AGENTS.override.md

Phase 5 never creates or modifies project-level:

```text
AGENTS.override.md
```

If an active root override is clearly detected, preserve it and report that it may shadow the normal root `AGENTS.md`
for Codex.

The override is not a bootstrap conflict unless its filesystem form makes safe repository work impossible.

Do not remove it automatically.

---

## 13. CONTEXT.md template

`CONTEXT.md` is durable product/domain context.

Keep the initial template concise, covering approximately:

```text
Purpose
Users / actors
Domain concepts
Important business rules
Current state
Constraints
Open questions
```

Unknown sections use explicit:

```text
TBD
```

or equivalent unresolved wording.

Do not invent:

- users;
- business rules;
- goals;
- metrics;
- domain terminology.

---

## 14. ARCHITECTURE.md template

`ARCHITECTURE.md` describes durable technical reality.

Initial sections should cover approximately:

```text
System overview
Major boundaries
Technology / runtime
Key flows
Data / external systems
Important invariants
Known constraints
Open architecture decisions
```

Unknown information remains `TBD`.

Do not guess a stack merely because it is common.

---

## 15. DESIGN.md

`DESIGN.md` is optional.

Create it only when:

- the owner explicitly requests it; or
- the existing repository clearly contains a meaningful user-facing interface and the bootstrap preview establishes that
  fact.

If UI relevance is unknown in a new/empty project:

```text
→ SKIP
```

Do not stop bootstrap only to ask whether a future product might eventually have UI.

A `DESIGN.md` can be added later.

Its initial template should cover only:

```text
Product/UI principles
Information hierarchy
Interaction patterns
Visual system
Responsive/accessibility expectations
Known constraints
Open design decisions
```

Unknowns remain explicit.

---

## 16. docs/README.md

Create one concise:

```text
docs/README.md
```

that explains the durable artifact map:

```text
adr/      durable decisions and rejected alternatives
research/ evidence gathered for decisions
plans/    approved and historical implementation plans
specs/    stable feature specifications when needed
testing/  durable testing strategy or specialized verification
```

Directories are created when first used.

This keeps the initial scaffold small.

---

## 17. No invented knowledge

Bootstrap is structural initialization, not project discovery.

It may use obvious structural facts only where needed to decide scaffold shape.

It must not populate project documents with plausible assumptions.

After bootstrap, project knowledge is developed through relevant workflows such as:

```text
$aic-analyze
$aic-research
$aic-clarify
$aic-plan
```

and explicitly authorized documentation updates.

---

## 18. Canonical templates

Add canonical assets under:

```text
templates/project/
├── README.md
├── AGENTS.md
├── CONTEXT.md
├── ARCHITECTURE.md
├── DESIGN.md
└── docs/
    └── README.md
```

Templates must:

- be provider-neutral where practical;
- contain no personal paths;
- contain no project-specific assumptions;
- remain concise;
- use explicit `TBD` only where project knowledge is genuinely unknown.

Do not introduce a general template engine.

Static Markdown assets are sufficient.

---

## 19. Native skill catalog

Update the Phase 4 native catalog from ten to eleven skills by adding:

```text
aic-bootstrap-project
```

Do not rename or alter the ten approved Phase 4 skills except where a genuine compatibility change is required.

The bootstrap skill remains explicit-only.

---

## 20. Package assets

The npm package must now include the canonical project templates required by the bootstrap skill.

Intended runtime asset classes become:

```text
standards/
skills/
templates/project/
```

`npm run pack:check` must confirm that unrelated docs, tests, plans, and local state are not accidentally packaged.

---

## 21. Validation

Add concise deterministic validation for project templates.

Verify at minimum:

- all required canonical template files exist;
- templates contain no personal absolute paths;
- no TODO/placeholder syntax accidentally escapes into production templates;
- expected `TBD` markers are deliberate;
- root AGENTS template remains compact;
- templates do not duplicate the global contract;
- `aic-bootstrap-project` exists in the native catalog;
- its Codex metadata disables implicit invocation.

Do not add a production dependency for template validation.

---

## 22. Tests

At minimum cover:

### Template integrity

All required templates exist and validate.

### New repository

Expected scaffold classification:

```text
AGENTS.md       CREATE
CONTEXT.md      CREATE
ARCHITECTURE.md CREATE
docs/README.md  CREATE
DESIGN.md       SKIP unless requested/relevant
```

### Existing repository

Existing canonical regular files are preserved.

### Structural conflict

Symlink/unsupported canonical path is reported as conflict.

### Design optionality

No unnecessary owner question or DESIGN creation when UI relevance is unknown.

### Skill catalog

Exactly eleven native skills exist and remain explicit-only.

### Package contents

Project templates are included; tests/plans are not.

All existing Phase 1–4 tests remain green.

---

## 23. Bootstrap behavior verification

Because the Phase 5 execution surface is an agent skill rather than a public CLI, automated tests validate:

- canonical templates;
- catalog/metadata;
- deterministic scaffold rules encoded in the skill;
- package assets.

Phase 9 dogfooding will provide real end-to-end workflow evidence on actual repositories.

Do not create a large runtime bootstrap engine solely to simulate an agent workflow in tests.

---

## 24. Documentation

Create:

```text
docs/architecture/project-bootstrap.md
```

Keep it concise.

Document:

- seed-only ownership;
- scaffold files;
- create/preserve/conflict semantics;
- optional DESIGN behavior;
- lazy docs directories;
- relationship to global contract and core skills.

Update `docs/architecture/core-workflow.md` only as needed to include `$aic-bootstrap-project`.

---

## 25. Explicitly outside Phase 5

Do not implement:

- product code generation;
- domain research automatically;
- automatic architecture inference;
- automatic DESIGN generation for unknown products;
- root README generation;
- Git initialization;
- commits;
- nested AGENTS generation;
- project `AGENTS.override.md`;
- Claude project adapter;
- external skills;
- UI skill bundle;
- public `project init` CLI;
- migration of existing real projects.

---

## 26. Definition of Done

Phase 5 is complete when:

- canonical project templates exist;
- root AGENTS template is compact;
- project files contain no invented facts;
- unknown content is represented explicitly;
- DESIGN is optional;
- docs artifact map exists without placeholder-directory noise;
- `$aic-bootstrap-project` exists;
- it is explicit-only;
- it preserves existing regular files;
- unsafe structural conflicts block mutation;
- bootstrap-created docs are repository-owned, not Phase 2 managed state;
- native catalog contains eleven skills;
- package contains required templates;
- existing Phase 1–4 tests pass;
- no real project is modified by automated tests;
- no public bootstrap CLI/framework is introduced;
- owner manual QA passes;
- no material open decision blocks Phase 6.

---

## 27. Approved decisions

Approval of this plan approves:

1. bootstrap is **seed-only**;
2. project docs become repository-owned immediately;
3. Phase 2 managed ownership is not used for evolving project docs;
4. execution surface is `$aic-bootstrap-project`;
5. no public project bootstrap CLI in Phase 5;
6. existing regular project files are preserved unchanged;
7. unsafe canonical-path objects block apply;
8. root AGENTS is created only when missing;
9. nested AGENTS files are not generated;
10. DESIGN is optional and not requested merely because future UI is possible;
11. docs category directories are created lazily;
12. no generic template engine;
13. native skill count becomes eleven.

---

## 28. Implementation sequence

1. Inspect Master Architecture, Phase 4 workflow, native catalog and current templates.
2. Reconfirm current project-level AGENTS discovery semantics from primary Codex sources.
3. Write the canonical project templates.
4. Implement `$aic-bootstrap-project`.
5. Add it to the native catalog and Codex metadata validation.
6. Add template/scaffold validation tests.
7. Update package asset rules.
8. Add concise project-bootstrap architecture documentation.
9. Run the complete test/packaging suite.
10. Review for invented project facts, unnecessary files and duplicated global guidance.
11. Produce completion report.
12. STOP — no commit and no Phase 6.

---

## 29. Completion report

Return:

### Status

`COMPLETE — awaiting manual verification`

or:

`BLOCKED — owner decision required`

### Files created / modified

Grouped concise list.

### Bootstrap scaffold

List canonical files and optional files.

### Ownership model

Confirm project docs are seed-only and repository-owned.

### Bootstrap skill

State:

```text
name
invocation policy
mutation boundary
preview/apply behavior
```

### Existing-repository behavior

Report CREATE / PRESERVE / CONFLICT semantics.

### Template validation

Report results and intentional TBD usage.

### Package contents

Report new packaged assets and anything unexpected.

### Verification

Exact commands + PASS/FAIL and test counts.

### Scope review

Confirm:

- no invented project facts;
- no existing-file overwrite;
- no real project mutation;
- no external skills;
- no public CLI/framework;
- no commit.

### Known gaps

If none:

`None.`

### Deviations

If none:

`None.`

### Open decisions before Phase 6

If none:

`None.`

### Commit

End exactly:

`No commit created. Awaiting explicit owner instruction.`

---

## Phase invariant

> **Bootstrap creates the structure for project knowledge; it does not invent the knowledge and does not own it
afterward.**
