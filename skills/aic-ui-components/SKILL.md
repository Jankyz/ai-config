---
name: aic-ui-components
description: Search and evaluate 21st UI components or add a selected component only within an approved implementation scope.
---

# UI component discovery

> **Adapted and modified from:** [`21st-dev/skill`](https://github.com/21st-dev/skill),
> `skills/21st-cli-use`, commit `0d77001a77fe8540bb07ed68d09092ee08546ed3`.
> Distributed under Apache-2.0; see `third_party/21st/LICENSE`.

## Purpose

Use the existing `21st` CLI to discover and inspect relevant components or themes before designing a new interface from scratch.

## Preconditions

- Read relevant project instructions, `DESIGN.md` when present, the framework, and existing components.
- Determine whether the request is read-only discovery or an approved implementation.
- Confirm that the `21st` executable is already available. If it is not, return `21ST_CLI_UNAVAILABLE` and stop this capability.

## Discovery — read-only

```text
21st search "<query>" --limit <N> [--type <component|theme|template>] [--json]
21st search button --type component
21st search dark --type theme
21st get <id> [--json]
21st theme <id> [--json]
```

- `search` returns catalog candidates. Use `--type` and a bounded `--limit` to narrow the result; use `--json` when structured inspection is useful.
- `get` returns a selected component's code and demo information. Use it after search to evaluate a candidate.
- `theme` returns a selected theme's CSS. Use it only when evaluating a theme candidate.

Compare candidates with the project's visual language, framework, accessibility needs, and stated scope. Report candidates and trade-offs without changing project files.

## Approved implementation

1. Confirm the selected component is inside an approved plan and implementation scope.
2. Preview the intended operation when supported: `21st add <component> --print`.
3. Add only the selected component:

   ```text
   21st add <user>/<slug>
   21st add @<team>/<slug>
   ```

   `21st add` may write component files and install dependencies through the project's package manager.

4. Inspect changed project files and package/dependency changes.
5. Run relevant project verification and report the outcome.

## Metering

Some retrieval and installation operations may be metered. Do not silently consume paid credits or cross a paywall. If an operation requires paid credits or payment that has not been explicitly authorized for the current task, return:

`BLOCKED — 21st paid operation requires owner authorization`

## Boundaries

- Do not install, configure, or authenticate the 21st CLI or its integrations.
- Do not expose, persist, or request credentials.
- Do not publish or remove remote resources.
- Do not invoke `npx`, `bunx`, `npm exec`, login/logout, setup, installer, publishing, editing, or deletion commands.
- Do not add components during discovery.
- Do not create plans, bypass approval, commit, push, or release.
