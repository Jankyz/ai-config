# AI Config — Phase 10: Public Release

**Status:** approved for implementation
**Approved:** 2026-09-09
**Parent architecture:** `docs/architecture/AI-CONFIG-MASTER-ARCHITECTURE-V1.md`  
**Previous phase:** `docs/plans/PHASE-9.1-PRODUCT-DESIGN-AND-DEPENDENCY-CURATION.md`  
**Phase:** 10 of 10  
**Primary target:** public GitHub repository + public npm package  
**Primary provider:** Codex  
**Secondary provider:** Claude  
**Commit / tag / publish authority:** explicit owner approval required

---

## 1. Goal

Publish the first public ai-config release from the environment that has already passed real Codex migration, dependency
migration, legacy cleanup, doctor, setup convergence, update convergence, package verification, and isolated clean-home
dogfooding.

Phase 10 must produce a release that allows another Mac to begin with:

```text
npx <published-package> setup --provider codex
```

review the exact setup plan, then apply it with:

```text
npx <published-package> setup --provider codex --apply
```

The public release must preserve the established ai-config guarantees:

```text
preview-first mutation
immutable dependency identities
external-managed runtime acquisition
managed-tool integrity
transactional installation
rollback
doctor
explicit workflow skills
provider-neutral canonical core
no OMX dependency
```

---

## 2. Release principle

> Release the system that already works; do not redesign it during release preparation.

Phase 10 is release engineering, documentation, metadata, CI/publishing, and post-publication verification.

Do not add new capabilities unless a discovered release blocker makes a bounded correction necessary.

---

## 3. Non-blocking compatibility gaps

Owner decision:

```text
Node.js 24 runtime dogfood = NOT a release blocker
Bun / bunx dogfood = NOT a release blocker
```

The current package baseline may remain declared as designed by the approved architecture.

However, the first public release documentation must honestly state that:

```text
primary real dogfood occurred on the currently tested Node runtime
Node 24 compatibility remains to be independently verified
Bun/bunx compatibility remains to be independently verified
```

Create explicit post-release verification items for both.

Do not claim compatibility evidence that does not exist.

A defect discovered after release may be fixed in a patch release.

---

# PART A — Release identity

## 4. Final package name

Before editing release metadata, verify the intended npm package name.

Preferred public name:

```text
ai-config
```

if available and appropriate.

If unavailable, do not invent or publish under a substitute automatically.

Return:

```text
PACKAGE NAME OWNER DECISION REQUIRED
```

with the smallest useful set of alternatives.

The GitHub repository name and npm package name do not have to be identical, but public naming should be consistent
where practical.

---

## 5. Initial version

The repository currently uses a development placeholder version.

Before publication select the first public semantic version.

Recommended default:

```text
0.1.0
```

because this is the first public release and post-release runtime compatibility checks remain intentionally open.

Do not use:

```text
0.0.0
```

for a public release.

Do not declare `1.0.0` unless the owner explicitly chooses stable-v1 semantics.

Version selection is an owner decision before the release commit.

---

## 6. Package metadata

Ensure `package.json` contains accurate public metadata:

```text
name
version
description
license
repository
homepage
bugs
bin
engines
files
keywords where useful
publishConfig where required
```

Repository URLs must point to the real public repository.

Do not include personal filesystem paths.

Do not add meaningless SEO keyword spam.

---

## 7. License

Confirm the repository's existing MIT license remains the license for ai-config-owned code.

Retain correct third-party licensing/provenance for:

```text
21st adapted resources/tool metadata
Matt adapted/external resources
shadcn adaptation
UI UX Pro Max external-managed resource
```

Ensure:

```text
LICENSE
THIRD_PARTY_NOTICES.md
third_party/*/LICENSE
```

are consistent with the final package.

Do not claim ownership of upstream resources.

---

# PART B — Public UX and documentation

## 8. README goal

Rewrite/refine the public README so a developer unfamiliar with the project can answer quickly:

```text
What is ai-config?
What does it install?
Why does it exist?
How do I preview setup?
How do I apply setup?
How do updates work?
How do I run doctor?
How do I rollback?
What does ai-config own?
What does it deliberately not own?
Which external dependencies are installed?
```

Do not turn README into internal architecture documentation.

---

## 9. README opening

The first screen should explain the product approximately as:

```text
ai-config is a reproducible, provider-aware environment manager for AI coding agents.

It installs a compact global contract, curated workflow skills,
verified external skills, and required managed tools while preserving
unmanaged provider configuration and user-owned files.
```

Keep the actual final wording concise and accurate.

---

## 10. Public quick start

Document preview first:

```bash
npx <package-name> setup --provider codex
```

Then apply:

```bash
npx <package-name> setup --provider codex --apply
```

Also document:

```bash
npx <package-name> doctor --provider codex
npx <package-name> update --provider codex
```

and the mutation form:

```bash
npx <package-name> update --provider codex --apply
```

Document rollback using an explicit transaction ID.

Do not document destructive shortcuts that do not exist.

---

## 11. Explain ownership

README must clearly distinguish:

### ai-config manages

```text
global canonical instructions
native/adapted skills
approved external-managed skills
managed tool versions
ai-config state/receipts/backups
```

### ai-config does not automatically own

```text
provider authentication
Codex config.toml
arbitrary MCP configuration
plugins
project dependencies
external Product Design availability
Browser availability
user-owned unrelated skills
```

This distinction is part of the product safety model.

---

## 12. Public dependency explanation

Document the hybrid dependency model:

### Native

Examples:

```text
aic-plan
aic-product-design-lead
aic-ui-review
```

### Adapted

Examples:

```text
aic-tdd
aic-domain-modeling
aic-shadcn
aic-ui-components
aic-ui-generate
```

### External-managed

```text
codebase-design
wayfinder
grill-me
grilling
writing-for-agents
ui-ux-pro-max
```

### Managed tool

```text
@21st-dev/cli
```

Explain that external-managed runtime bytes are acquired from exact locked upstream identities during setup/update
rather than bundled as uncontrolled mutable installers.

Do not expose unnecessary internal implementation detail in the quick start.

---

## 13. External capabilities

Document that some optional evidence sources remain externally provided:

```text
OpenAI Product Design
Browser / computer-use capabilities
project-owned Playwright or equivalent
21st authentication/quota where required
Python for UI UX Pro Max searchable data
```

ai-config may diagnose their availability but does not automatically install or authenticate them unless explicitly
documented otherwise.

---

## 14. Security / safety section

Include a concise section describing:

```text
preview-first mutation
--apply requirement
conflict detection
no force-overwrite
ownership tracking
transaction backups
rollback
locked dependency provenance
integrity verification
no automatic upstream latest adoption
```

Do not make absolute security claims.

---

# PART C — Release CI

## 15. CI release gate

The release commit must pass the complete repository verification:

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

Also:

```bash
git diff --check
```

Known intentional Markdown hard-break spaces should either be normalized before release or documented narrowly.

Prefer a clean `git diff --check` for the release commit.

---

## 16. Package inspection

Before publish inspect the exact npm package manifest/tarball content.

Confirm inclusion of:

```text
runtime JS
bin launcher
canonical skills
standards
project templates
upstream registry/lock
THIRD_PARTY_NOTICES
required third-party licenses
```

Confirm exclusion of:

```text
tests
plans
temporary fixtures
external-managed runtime snapshots
npm dependency tarballs
node_modules
local state
personal paths
credentials
build scratch files
```

The published tarball is the release artifact under review.

---

## 17. Publish automation

Prefer a dedicated GitHub Actions release workflow.

The publishing workflow should:

```text
checkout exact release commit
use a controlled Node runtime
npm ci
run release verification
build/package
publish the package
```

Prefer npm Trusted Publishing / OIDC if available for the final package/repository configuration.

Do not commit npm access tokens.

If trusted publishing cannot be configured for the initial package bootstrap, stop and return the exact safe bootstrap
options to the owner.

Do not silently switch to a long-lived token workflow.

---

## 18. Provenance

For a public npm package, prefer publishing with npm provenance through supported CI/trusted publishing.

The public package should be traceable to:

```text
repository
release workflow
source commit
published package
```

Do not manually fabricate provenance metadata.

---

## 19. Workflow permissions

The release workflow should use the minimum required GitHub permissions.

For normal verification:

```text
contents: read
```

Add publishing identity permissions only where required by the chosen npm trusted-publishing/provenance mechanism.

Do not give broad write permissions to unrelated repository resources.

---

# PART D — Release preparation

## 20. Clean release tree

Before creating a release:

```text
working tree clean
all intended changes committed
no unrelated staged/untracked files
```

Do not release directly from an uncommitted local working tree.

---

## 21. Final release commit

Prepare one bounded release-preparation commit containing only the approved Phase 10 changes, such as:

```text
package metadata/version
README
release workflow
release documentation
small release-readiness fixes
```

No tag yet.

Return the commit candidate for owner review.

Do not commit unless explicitly authorized.

---

## 22. Pre-publish package smoke test

From the exact release candidate commit:

1. create the npm tarball locally;
2. use that exact tarball in a fresh isolated environment;
3. run representative:

```text
--help
--version
setup preview
setup --apply
doctor
setup preview → NOOP
update preview → NOOP
```

Verify external-managed dependencies and managed 21st tool are acquired through the real runtime pipeline.

Do not use source-tree shortcuts.

---

# PART E — Publish gate

## 23. Mandatory owner publish approval

After all release candidate checks pass, STOP and return:

```text
PUBLIC RELEASE APPROVAL REQUIRED
```

Report:

```text
package name
version
release commit SHA
package tarball SHA-256
package file count/size
test counts
npm target
GitHub tag
GitHub release title
publishing mechanism
known post-release gaps
```

No npm publish, tag, GitHub Release, or public mutation occurs before this approval.

---

# PART F — Publication

## 24. Tag

After owner approval create the exact semantic-version tag:

```text
v<version>
```

The tag must point to the approved release commit.

Do not move or reuse a release tag after publication.

---

## 25. npm publish

Publish exactly the approved package/version.

For a public first release, ensure public access semantics are correct.

Do not:

```text
publish a different working tree
publish a newer local build
publish latest upstream dependency changes
change the version during publish
```

The published bytes must correspond to the approved release artifact/process.

---

## 26. GitHub Release

Create a GitHub Release from the exact release tag.

Release notes should contain:

```text
what ai-config is
major included capabilities
installation quick start
known compatibility gaps
link/reference to npm package
```

Do not paste the internal implementation history of all ten phases.

---

# PART G — Public-registry smoke test

## 27. Registry installation test

After npm publication, test the **actual public registry package**, not the local tarball.

Use a fresh isolated environment first.

Run the public equivalent of:

```bash
npx <package>@<version> --version
npx <package>@<version> setup --provider codex
npx <package>@<version> setup --provider codex --apply
npx <package>@<version> doctor --provider codex
npx <package>@<version> setup --provider codex
```

Expected:

```text
correct version
setup preview works
apply succeeds
doctor healthy
second setup NOOP
```

Do not use the owner's real environment as the first post-publish test.

---

## 28. Dependency acquisition smoke test

The public package test must prove runtime acquisition of:

```text
codebase-design
wayfinder
grill-me
grilling
writing-for-agents
ui-ux-pro-max
@21st-dev/cli pinned version
```

from the locked identities in the released package.

No unpublished repository fixtures or local upstream snapshots may participate.

---

## 29. Public package inspection

After publication verify:

```text
npm package page/version exists
license correct
README renders
repository link correct
bin executable exposed
package contents expected
```

If provenance is enabled, verify it is visible/valid.

---

# PART H — Post-release compatibility

## 30. Node 24

Owner explicitly allows first release before independent Node 24 runtime dogfood.

After publication create/record:

```text
POST-RELEASE — verify public package on actual Node.js 24
```

Test at minimum:

```text
--version
setup preview
setup apply in isolated home
doctor
NOOP convergence
```

If a defect is found:

```text
fix
test
patch release
```

Do not rewrite history of the initial release.

---

## 31. Bun / bunx

Likewise record:

```text
POST-RELEASE — verify Bun/bunx launcher path
```

Test the actual public package.

If unsupported behavior is discovered, either:

```text
fix and patch
```

or:

```text
document/remove unsupported compatibility claim
```

based on actual evidence.

---

## 32. First-release observation

After release, monitor only actionable technical feedback:

```text
install failures
dependency acquisition failures
permission issues
provider-path issues
doctor false positives
platform compatibility
```

Do not introduce telemetry into v1 solely for release monitoring.

Use public issues/logs supplied by users.

---

# PART I — Documentation after publication

## 33. README versionless commands

Public README should normally teach:

```text
npx <package> ...
```

rather than hardcoding the initial release version in ordinary usage.

Release verification itself should use exact versions where reproducibility matters.

---

## 34. Contribution boundary

Before or shortly after release, ensure public contributors can understand:

```text
where canonical skills live
how external sources are pinned
how adapted resources are updated
why latest is not used
how to run tests
```

A large contributor guide is not required for first release if README/architecture docs already make the workflow clear.

---

# PART J — Explicit exclusions

## 35. Do not include in Phase 10

Do not:

```text
add new Matt skills
restore OMX
migrate deferred design/brand/slides capabilities
remove skill-lore-commit-message
remove design
install Node or Bun automatically
add telemetry
add auto-update
build a GUI/TUI
add Windows/Linux support claims without evidence
restructure the installer
rewrite dependency management
change the approved product-design workflow
```

Those can be future releases.

---

# PART K — Definition of Done

## 36. Phase 10 complete when

- public package identity is finalized;
- package version is finalized;
- metadata contains no development placeholders;
- README accurately explains setup/update/doctor/rollback;
- package contents are intentional;
- release CI passes;
- npm publishing mechanism is configured safely;
- release candidate tarball passes isolated smoke test;
- owner approves exact release artifact;
- exact tag is created;
- package is published to npm;
- GitHub Release is created;
- actual public registry package passes isolated smoke test;
- external-managed dependency acquisition works from the public package;
- public package metadata/README/license are correct;
- Node 24 is explicitly recorded as post-release verification;
- Bun/bunx is explicitly recorded as post-release verification;
- no unapproved environment/repository mutation occurs.

---

# PART L — Implementation sequence

## Stage 1 — release audit

1. Read the complete current repository state.
2. Verify package/repository naming.
3. Verify npm package-name availability/ownership.
4. Inspect current `package.json`.
5. Inspect README from a first-time-user perspective.
6. Inspect current CI/package workflows.
7. Verify legal/provenance package material.
8. Return release-readiness findings.

If a material naming/publishing decision remains:

```text
RELEASE CONFIGURATION APPROVAL REQUIRED
```

STOP for owner decision.

## Stage 2 — release preparation

After required decisions:

9. finalize package metadata/version;
10. finalize README;
11. implement release workflow;
12. make only bounded release-readiness fixes;
13. run full verification;
14. create and inspect exact release tarball;
15. dogfood tarball in isolated environment;
16. produce release candidate report.

STOP at:

```text
PUBLIC RELEASE APPROVAL REQUIRED
```

## Stage 3 — publication

Only after explicit owner approval:

17. commit approved release changes if not already committed;
18. create exact release tag;
19. publish exact package through approved publishing mechanism;
20. create GitHub Release.

## Stage 4 — public artifact verification

21. test exact public npm version in isolated environment;
22. verify dependency acquisition;
23. verify npm/GitHub metadata;
24. report first public release status.

Do not automatically start post-release feature work.

---

# 37. Gate 1 — release configuration

Return:

```text
RELEASE CONFIGURATION APPROVAL REQUIRED
```

if owner input is needed for:

```text
package name
initial version
npm publishing identity/bootstrap
release automation choice
```

Recommended defaults:

```text
version: 0.1.0
publishing: GitHub Actions + npm Trusted Publishing/OIDC
Git tag: v0.1.0
GitHub Release: v0.1.0
```

Do not silently choose a different package name if `ai-config` is unavailable.

---

# 38. Gate 2 — publication

Immediately before public mutation return:

```text
PUBLIC RELEASE APPROVAL REQUIRED
```

with:

```text
package
version
commit
tag
tarball hash
tarball size
package contents
verification counts
publishing method
known gaps
```

Owner must explicitly approve.

---

# 39. Completion report

After successful publication return:

```text
PUBLIC RELEASE COMPLETE
```

with:

```text
package name
version
npm publication status
Git tag
GitHub Release
release commit
public package smoke-test result
external dependency acquisition result
doctor/NOOP result
provenance status
known post-release verification items
```

Explicitly list:

```text
Node 24 public-package verification pending
Bun/bunx public-package verification pending
```

until they have actually been tested.

---

## Phase invariant

> **Publish only the exact artifact that was reviewed, make the first install safe and understandable, and treat
post-release compatibility findings as patchable evidence rather than reasons to fabricate pre-release certainty.**
