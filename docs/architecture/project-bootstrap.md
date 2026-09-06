# Project bootstrap

`$aic-bootstrap-project` seeds a small, repository-owned knowledge scaffold. It is not an
installer operation: after creation, `AGENTS.md`, `CONTEXT.md`, `ARCHITECTURE.md`, optional
`DESIGN.md`, and `docs/README.md` belong to the repository and are never recorded as managed
Phase 2 artifacts.

For each canonical path, a missing required file is `CREATE`, an existing regular file is
`PRESERVE`, and a symlink or unsupported object is `CONFLICT`. Missing `DESIGN.md` is `SKIP`
unless the owner requests it or meaningful UI is established during preview. Bootstrap only applies
an explicit bootstrap/initialize request and never creates or changes `AGENTS.override.md`.

`docs/README.md` maps the lazy `adr/`, `research/`, `plans/`, `specs/`, and `testing/` locations;
they are created with their first real artifact. The compact project `AGENTS.md` supplements the
global contract by directing agents to durable project knowledge and the explicit core skills.
