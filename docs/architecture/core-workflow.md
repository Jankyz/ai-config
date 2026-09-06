# Core workflow

The global agent contract is the compact, always-loaded baseline. It sets durable rules for planning, execution, verification, ownership, and commits.

Standards explain those durable rules. Skills provide focused procedures and are explicitly invoked by their `aic-*` names; Codex does not invoke a Phase 4 workflow implicitly.

The core sequence is: research or clarify when needed; plan; owner approval; implement; evidence-based verification; focused review or security review when required; owner-authorized Lore commit.

`aic-research`, `aic-clarify`, `aic-analyze`, `aic-diagnose`, `aic-review`, `aic-verify`, and `aic-security-review` are read-only. `aic-plan` creates a plan but does not implement. `aic-implement` mutates only under an approved plan. `aic-bootstrap-project` creates only the approved missing repository-knowledge scaffold after explicit invocation; those files are repository-owned from creation. `aic-lore-commit` may make a Git commit only after explicit invocation and owner authorization.
