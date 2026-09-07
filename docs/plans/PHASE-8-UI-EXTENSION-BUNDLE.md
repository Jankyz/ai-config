# AI Config — Phase 8: UI Extension Bundle

**Status:** approved for implementation
**Approved:** 2026-09-07
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-7-EXTERNAL-SOURCE-MANAGER.md`  
**Phase:** 8 of 10  
**Implementation authority:** no implementation before explicit owner approval  
**Commit authority:** no commits without explicit owner instruction

---

## 1. Goal

Add a small provider-neutral UI extension bundle using the external-source infrastructure completed in Phase 7.

Phase 8 introduces three explicit-only capabilities:

```text
aic-ui-components
aic-ui-generate
aic-ui-review
```

They extend the existing ai-config workflow without introducing another orchestration framework, design source of truth,
agent runtime, or automatic UI workflow.

## Owner-approved amendment — 2026-09-07

The originally assumed standalone Oh My Codex visual-verdict resource does not exist at the registered immutable
revision. `aic-ui-review` is therefore a native provider-neutral ai-config skill, not an adapted OMX resource. Oh My
Codex remains reference-only and unchanged; no OMX bytes are distributed or require a Phase 8 notice. The two 21st
resources remain adapted as specified. This amendment supersedes only the conflicting OMX provenance, notice, and
resource-validation requirements; all visual-review behavior and other approved constraints remain unchanged.

---

## 2. Core rule

> UI extensions provide bounded capabilities. They do not own the development workflow.

Existing ai-config rules remain authoritative:

```text
relevant project context
→ plan where material change is required
→ owner approval
→ implementation
→ verification
→ explicit commit
```

UI skills must not bypass these gates.

---

## 3. Selected upstream capabilities

### `aic-ui-components`

Adapt from current upstream:

```text
21st-dev/skill
skills/21st-cli-use
```

Purpose:

- search the 21st component/theme catalog;
- inspect candidate components;
- retrieve candidate information;
- add a selected component only when project mutation is already authorized.

### `aic-ui-generate`

Adapt from:

```text
21st-dev/skill
skills/21st-ai
```

Purpose:

- generate UI concepts through 21st AI;
- inspect variants;
- iterate on a selected variant;
- pull generated code only inside an approved implementation scope.

### `aic-ui-review`

Adapt from the standalone visual-verdict capability currently represented by Oh My Codex.

Purpose:

- compare implementation screenshot(s) with approved reference image(s);
- report structured visual differences;
- return a bounded PASS / REVISE / FAIL verdict;
- remain read-only.

---

## 4. Stable ai-config names

Do not expose upstream skill names as the durable user contract.

Use:

```text
$aic-ui-components
$aic-ui-generate
$aic-ui-review
```

Upstream projects may rename or restructure their skills.

The ai-config names remain stable.

This is why all three resources use:

```text
mode = adapted
```

rather than `external-managed`.

---

## 5. Explicit invocation only

All three skills are manual/explicit-only.

For Codex:

```text
policy.allow_implicit_invocation: false
```

For Claude, use the existing provider translation that renders:

```text
disable-model-invocation: true
```

Do not modify canonical provider-neutral skill frontmatter with provider-specific fields.

No automatic invocation from the global contract.

---

## 6. Canonical local skills

Create:

```text
skills/
├── aic-ui-components/
│   ├── SKILL.md
│   └── agents/openai.yaml
├── aic-ui-generate/
│   ├── SKILL.md
│   └── agents/openai.yaml
└── aic-ui-review/
    ├── SKILL.md
    └── agents/openai.yaml
```

Reuse the Phase 4 skill catalog and provider installation paths.

Do not create another skill registry or extension framework unless the current architecture genuinely cannot represent
these skills.

---

## 7. 21st source registration

Add:

```text
21st-dev/skill
```

to `upstream/registry.json`.

At implementation time verify from the authoritative repository:

- exact repository identity;
- current immutable commit;
- Apache-2.0 license evidence;
- exact paths of:
  - `skills/21st-cli-use`
  - `skills/21st-ai`.

Register both resources as:

```text
adapted
```

with local paths:

```text
skills/aic-ui-components
skills/aic-ui-generate
```

Resolve and pin the exact upstream resource digests using Phase 7.

Do not blindly install the complete 21st skills repository.

---

## 8. OMX resource registration

Reuse the existing:

```text
oh-my-codex
```

source.

Add only the verified standalone visual-verdict resource as an adapted resource targeting:

```text
skills/aic-ui-review
```

Verify its exact resource path at the locked commit.

If the currently locked OMX commit does not contain the required canonical resource:

1. resolve the current candidate commit;
2. inspect the selected resource diff;
3. verify license evidence;
4. report old and proposed commit;
5. advance the OMX lock only as part of this explicitly approved Phase 8 change.

Do not adopt unrelated OMX workflow resources.

Matt remains unchanged and reference-only.

---

## 9. Adaptation rule

Do not copy the upstream skill text blindly.

The adapted skill should retain the useful capability while removing upstream assumptions that conflict with ai-config.

In particular remove or replace:

- implicit/automatic invocation;
- upstream installer instructions;
- OMX state directories;
- Ralph/autopilot/team dependencies;
- upstream commit behavior;
- competing plan/design governance;
- provider-specific paths;
- mutable `latest` execution instructions;
- external publishing behavior not required by the capability.

The local ai-config skill becomes authoritative after adaptation.

Future upstream changes produce review input only.

---

## 10. `aic-ui-components` contract

The skill should:

1. read relevant `DESIGN.md`, project instructions, framework and existing components;
2. determine whether the request is discovery or approved project mutation;
3. prefer search/inspection before creating UI from scratch;
4. use an existing `21st` executable when available;
5. clearly report when the CLI is unavailable;
6. never install the 21st skill/plugin/MCP configuration itself;
7. never perform login automatically;
8. never expose or persist API keys;
9. never publish/delete remote resources;
10. verify the project diff after any approved `21st add`.

If invoked only to find or evaluate components, it must remain read-only.

---

## 11. `aic-ui-generate` contract

The skill should distinguish:

```text
exploration
```

from:

```text
project mutation
```

### Exploration

May:

- generate concepts;
- inspect variants;
- iterate on external drafts.

It must not pull generated code into the repository unless mutation is authorized.

### Approved implementation

May use the 21st workflow to pull a chosen result only inside the approved plan/scope.

After project mutation:

- inspect changed files;
- inspect dependencies;
- run relevant project verification;
- do not commit.

If 21st requires authentication, credits, payment, or interactive user action, report the requirement rather than
attempting to bypass it.

---

## 12. 21st runtime boundary

Phase 8 manages **agent instructions**, not installation of the 21st CLI runtime.

Do not automatically execute:

```text
npx skills add ...
21st install-skill
21st init --write
```

during ai-config setup/update.

Do not add automatic global npm installation.

The skills use an existing `21st` executable when available.

If unavailable:

```text
21ST_CLI_UNAVAILABLE
```

and stop that capability cleanly.

Whether ai-config should own installation/pinning of external executable tools is deferred until Phase 9 dogfooding
provides evidence that it is necessary.

---

## 13. External credentials

ai-config does not own 21st credentials.

Allowed:

- existing 21st login state;
- provider-standard environment variables already configured by the user.

Do not:

- save tokens in ai-config state;
- copy credentials into skills;
- log secrets;
- ask the user to paste secrets into project files.

Missing authentication must fail clearly.

---

## 14. `aic-ui-review` contract

The skill is read-only.

Required input:

```text
generated/current screenshot
+
one or more approved visual references
```

If the evidence is unavailable:

```text
BLOCKED — visual evidence unavailable
```

Do not invent a visual comparison from source code alone.

Return a structured result containing at minimum:

```text
score: 0-100
verdict: PASS | REVISE | FAIL
category_match: boolean
differences[]
suggestions[]
summary
```

Default PASS threshold:

```text
score >= 90
```

The score is a structured review heuristic, not a mathematical pixel-fidelity guarantee.

Focus findings on observable:

- layout;
- spacing;
- typography;
- sizing;
- hierarchy;
- color;
- component styling;
- responsive differences where evidence exists.

Do not modify implementation files.

---

## 15. Relationship to DESIGN.md

`DESIGN.md` remains the durable project design source of truth established by ai-config.

Do not import OMX `$design`.

UI skills read relevant `DESIGN.md` when it exists.

They must not silently rewrite it.

When implementation exposes a material unresolved design decision, report it through the existing ai-config
decision/planning workflow.

---

## 16. Explicit exclusions

Do not include in Phase 8:

```text
21st-registry
21st-design-sync
OMX design
OMX visual-ralph
OMX frontend-ui-ux
Matt prototype
product-design-lead
whole 21st plugin
whole OMX plugin
MCP setup
browser automation framework
automatic screenshot loop
```

Reasons:

- publishing to 21st is not part of the coding environment;
- OMX design duplicates current project design governance;
- visual-ralph introduces a competing execution/state loop;
- Matt prototype overlaps exploration capability and has different workflow semantics;
- no sufficiently authoritative current `product-design-lead` upstream is selected;
- plugin/MCP architecture is outside this phase.

---

## 17. Third-party notices

Update/create:

```text
THIRD_PARTY_NOTICES.md
```

for the adapted resources actually distributed.

Record at minimum:

### 21st

- upstream repository;
- selected resource paths;
- exact base commit;
- Apache-2.0;
- adapted status.

### Oh My Codex

- upstream repository;
- visual-verdict resource;
- exact base commit;
- MIT;
- adapted status.

Use Phase 7 provenance as source of truth.

Do not add Matt notices while Matt remains reference-only.

---

## 18. Provider behavior

Both Codex and Claude must receive equivalent canonical capabilities.

Verify:

```text
Codex:
$aic-ui-components
$aic-ui-generate
$aic-ui-review

Claude:
/aic-ui-components
/aic-ui-generate
/aic-ui-review
```

according to existing provider-native invocation conventions.

No provider-specific semantic divergence.

No changes to:

```text
AGENTS.md
CLAUDE.md global contract
config.toml
Claude settings
```

unless strictly required for skill installation.

---

## 19. Installation model

The three UI skills join the existing managed global skill set.

Do not add a new user-facing bundle configuration system in Phase 8.

Because all skills are explicit-only and lazily loaded, installing them globally does not authorize external calls or
project mutation.

Actual invocation remains user-controlled.

---

## 20. Tests

Required deterministic coverage:

### Upstream / provenance

- 21st source and selected resources validate against registry/lock;
- OMX visual resource validates;
- adapted local paths are correct;
- upstream digests are pinned;
- license evidence is pinned;
- third-party notices correspond to distributed adapted resources.

### Skill invariants

All UI skills:

- use `aic-` names;
- are explicit-only;
- contain no provider-specific canonical invocation field;
- do not commit;
- do not own project planning;
- do not invoke upstream skill installers.

### 21st safety

Ensure adapted skills do not contain active instructions for:

```text
install-skill
skills add
init --write
publish
publish-theme
delete
automatic login
```

`aic-ui-components` read-only discovery must not imply `add`.

`aic-ui-generate` must separate exploration from project mutation.

### UI review

Verify the documented output contract and missing-evidence stop behavior.

### Provider installation

Codex and Claude plans include all three skills and converge to `NOOP`.

No real home/provider configuration is mutated by automated tests.

---

## 21. Live upstream verification

During implementation perform read-only live verification of:

```text
21st-dev/skill
Yeachan-Heo/oh-my-codex
```

Only inspect selected resource paths, immutable revisions, and license evidence.

Do not run their installers or external code.

If a selected resource no longer exists or its license cannot be established:

```text
BLOCKED — owner decision required
```

Do not silently substitute a similar skill from another repository.

---

## 22. Documentation

Create/update concise:

```text
docs/architecture/ui-extensions.md
docs/architecture/core-workflow.md
docs/providers/codex.md
docs/providers/claude.md
upstream/README.md
THIRD_PARTY_NOTICES.md
```

only where actual Phase 8 behavior requires it.

Document:

```text
capability
upstream provenance
stable ai-config name
explicit invocation
21st prerequisite boundary
visual review evidence requirement
update/adaptation model
```

Avoid duplicating full skill contents.

---

## 23. Definition of Done

Phase 8 is complete when:

- exactly three UI extension skills exist;
- all use stable `aic-` names;
- all are explicit-only;
- 21st selected resources are pinned and adapted;
- visual-verdict is pinned and adapted;
- Matt remains reference-only;
- 21st publishing skills are excluded;
- no OMX runtime/state/workflow is introduced;
- no automatic external CLI installation occurs;
- credentials remain external;
- visual review is read-only and evidence-based;
- provider installation converges for Codex and Claude;
- third-party notices are correct;
- all Phase 1–7 tests remain green;
- no unnecessary production dependency is added;
- no commit is created without owner instruction.

---

## 24. Implementation sequence

1. Inspect Phase 4 skill catalog/provider installation behavior.
2. Inspect Phase 7 registry/lock and adaptation support.
3. Verify current 21st and OMX selected resources/licenses.
4. Register/pin selected upstream resources.
5. Create the three compact adapted canonical skills.
6. Add explicit-only Codex metadata.
7. Verify Claude translation.
8. Add/update third-party notices.
9. Add deterministic provenance/skill/provider tests.
10. Run full repository verification and package inspection.
11. Perform focused review for workflow bypass, external writes, secrets and provenance.
12. Report results.
13. STOP — no commit and no Phase 9.

---

## 25. Approved decisions

Approval of this plan approves:

1. exactly three Phase 8 capabilities;
2. stable local names:
  - `aic-ui-components`
  - `aic-ui-generate`
  - `aic-ui-review`;
3. all three resources use `adapted` mode;
4. selected upstreams are 21st and OMX only;
5. Matt remains reference-only;
6. 21st publishing capabilities are excluded;
7. OMX design/visual-ralph runtime is excluded;
8. all UI skills remain explicit-only;
9. 21st CLI installation/auth remain external in Phase 8;
10. UI review requires actual visual evidence;
11. no new bundle/configuration framework;
12. no public CLI expansion.

---

## Phase invariant

> **UI extensions may strengthen design execution; they may not replace ai-config's planning, approval, verification, or
ownership model.**
