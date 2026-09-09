# UI extensions

Phase 8 adds three explicit-only global skills without changing ai-config's workflow ownership.

| Capability    | Stable invocation    | Origin                                              | Boundary                                                                                         |
| ------------- | -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Components    | `$aic-ui-components` | Adapted from `21st-dev/skill` `skills/21st-cli-use` | Discovery is read-only; adding a component requires an approved implementation scope.            |
| Generation    | `$aic-ui-generate`   | Adapted from `21st-dev/skill` `skills/21st-ai`      | External concept exploration is allowed; pulling code requires an approved implementation scope. |
| Visual review | `$aic-ui-review`     | Native ai-config                                    | Read-only comparison of current screenshots and approved references.                             |

The 21st CLI is a managed tool pinned to `@21st-dev/cli@1.17.0` and installed only under ai-config state ownership. ai-config never authenticates it, and credentials remain provider-owned. If the launcher is unavailable, the 21st capabilities return `21ST_CLI_UNAVAILABLE`.

`aic-ui-review` requires actual current screenshot evidence and one or more approved references. Otherwise it returns `BLOCKED — visual evidence unavailable`. Its score is a structured heuristic, not a pixel-fidelity guarantee; `PASS` requires a score of at least 90.

The two 21st resources are adapted locally and pinned in `upstream/lock.json`. Their upstream changes are review input only. Selected Matt skills and UI UX Pro Max are separately locked Phase 9.1 dependencies; OMX is not distributed.
