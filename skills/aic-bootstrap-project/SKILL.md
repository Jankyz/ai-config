---
name: aic-bootstrap-project
description: Preview or seed a repository-owned project knowledge scaffold when explicitly invoked.
---

# Project bootstrap

## Purpose

Create the minimal structure for durable project knowledge without inventing that knowledge or
owning it after creation.

## Preconditions

- The user explicitly invoked `$aic-bootstrap-project`.
- The intended project root is clear. For a Git repository, resolve the worktree root with the
  direct `git rev-parse --show-toplevel` process call; otherwise use only the project directory
  established by the task. Resolve that existing directory to its physical path before inspection.

## Procedure

1. Decide whether the request is a preview/inspection or an actual bootstrap. A preview never
   mutates.
2. Use the bundled `assets/project/` files as the exact scaffold source. Never reconstruct a
   template from prose or memory when its bundled asset exists.
3. Inspect only the canonical paths below the resolved physical root: `AGENTS.md`, `CONTEXT.md`,
   `ARCHITECTURE.md`, `DESIGN.md`, and `docs/README.md`. Use non-following filesystem inspection
   for each descendant; a symlink or unsupported path component is a conflict. Do not scan or
   normalize nested instructions.
4. Classify each canonical path: a missing required path is `CREATE`; an existing regular file is
   `PRESERVE`; a symlink or unsupported filesystem object is `CONFLICT`; missing `DESIGN.md` is
   `SKIP` unless the owner requested a design scaffold or the preview establishes meaningful UI.
5. Preserve any root `AGENTS.override.md` and report that it may shadow `AGENTS.md`; never create
   or modify it.
6. Report the proposed scaffold. If the request explicitly asks to bootstrap or initialize and
   there are no material conflicts, create only the approved missing files from the static
   templates. Immediately before each creation, re-check the bounded destination below the
   physical root. If it is now a regular file, preserve it; if it is a symlink or unsupported
   object, report a conflict. Never overwrite. Do not ask for a second confirmation.

## Scaffold

Create when missing: `AGENTS.md`, `CONTEXT.md`, `ARCHITECTURE.md`, and `docs/README.md`.
`DESIGN.md` is optional. The lazy durable locations are `docs/adr/`, `docs/research/`,
`docs/plans/`, `docs/specs/`, and `docs/testing/`; do not create them until a real artifact needs
them.

## Boundaries

Bootstrap-created files are repository-owned immediately and must not be entered into installer
ownership state. Never overwrite, merge, adopt, or rewrite existing project documents. Do not
initialize Git, create nested `AGENTS.md`, infer project facts, generate product code, add a public
CLI, commit, push, or continue into later phases.
