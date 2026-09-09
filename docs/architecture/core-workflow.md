# Core workflow

The global agent contract is the compact, always-loaded baseline. It sets durable rules for planning, execution, verification, ownership, and commits.

Standards explain those durable rules. Skills provide focused procedures and are explicitly invoked by their `aic-*` names; Codex uses explicit `$aic-*` invocation and Claude uses explicit `/aic-*` invocation. Neither provider representation permits implicit workflow invocation.

The core sequence is: research or clarify when needed; plan; owner approval; implement; evidence-based verification; focused review or security review when required; owner-authorized Lore commit.

`aic-research`, `aic-clarify`, `aic-analyze`, `aic-diagnose`, `aic-review`, `aic-verify`, and `aic-security-review` are read-only. `aic-plan` creates a plan but does not implement. `aic-implement` mutates only under an approved plan. `aic-bootstrap-project` creates only the approved missing repository-knowledge scaffold after explicit invocation; those files are repository-owned from creation. `aic-lore-commit` may make a Git commit only after explicit invocation and owner authorization.

`aic-ui-components`, `aic-ui-generate`, and `aic-ui-review` are explicit UI extensions. The first two resolve the ai-config-managed exact 21st CLI when installed; they never authenticate or configure it. Component discovery and UI exploration are read-only. Adding or pulling code remains inside an approved implementation scope. Visual review is read-only and requires a current screenshot plus approved reference evidence.

`aic-product-design-lead`, `aic-tdd`, `aic-domain-modeling`, and `aic-shadcn` are explicit-only adapted/native extensions. They preserve product-design, test-first, domain-modeling, and shadcn guidance while remaining subject to the same planning, ownership, dependency, and commit gates as the core workflow.
