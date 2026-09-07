---
name: aic-ui-generate
description: Explore UI concepts with 21st AI or pull a selected result only within an approved implementation scope.
---

# UI concept generation

> **Adapted and modified from:** [`21st-dev/skill`](https://github.com/21st-dev/skill),
> `skills/21st-ai`, commit `0d77001a77fe8540bb07ed68d09092ee08546ed3`.
> Distributed under Apache-2.0; see `third_party/21st/LICENSE`.

## Purpose

Use the existing 21st CLI to create and refine external UI concepts while preserving ai-config planning, approval, and implementation boundaries.

## Preconditions

- Read relevant project instructions, `DESIGN.md` when present, and the target framework.
- Determine whether the request is exploration or approved implementation.
- Confirm that the `21st` executable is already available. If it is not, return `21ST_CLI_UNAVAILABLE` and stop this capability.

## Exploration

```text
21st generate "<prompt>"
21st generation <projectId>
21st iterate <projectId> "<change>" --take <N>
21st take <projectId> --take <N>
21st take <projectId> --take <N> --code
```

- `generate` creates external concept variants and returns a project ID.
- `generation` lists the available variants for that project.
- `iterate` refines one selected external variant.
- `take` returns the normal copy-prompt. Prefer it as a design specification for implementation in the project's real stack.
- `take --code` returns standalone HTML for inspection when useful or explicitly requested; never treat it as production-ready source or paste it blindly into the project.

Generate concepts, inspect variants, and refine selected external drafts without writing generated output into the local repository.

## Approved implementation

1. Confirm the selected result is within an approved plan and implementation scope.
2. Use the selected result as implementation input in the project's real stack; do not create a competing 21st implementation loop.
3. Inspect changed files and dependency changes.
4. Run relevant project verification and report the outcome.

## Stop conditions

- If authentication, credits, payment, or interactive user action is required, report the requirement and stop.
- Stop for unresolved material design decisions and return them to the existing planning workflow.
- If an operation requires paid credits or payment that has not been explicitly authorized for the current task, return `BLOCKED — 21st paid operation requires owner authorization`.

## Boundaries

- Do not install, configure, or authenticate the 21st CLI or its integrations.
- Do not expose, persist, or request credentials.
- Do not publish or remove remote resources.
- Do not invoke `npx`, `bunx`, `npm exec`, login/logout, setup, installer, publishing, editing, or deletion commands.
- Do not pull code during exploration.
- Do not create plans, bypass approval, commit, push, or release.
