---
name: aic-lore-commit
description: Create one explicitly authorized Lore-format Git commit after inspecting the intended verified scope.
---

# Authorized Lore commit

## Purpose

Create one coherent Git commit that preserves decision context and verification evidence after explicit owner authorization.

## Preconditions

- The owner has explicitly authorized a commit.
- Implementation and required verification are complete.
- The intended file scope and commit boundary are known.

## Procedure

1. Inspect repository status, staged state, and diff.
2. Confirm that only intended files belong in the commit; unstage unrelated changes where safe and authorized.
3. Write a Lore message whose first line explains intent, not the diff.
4. Include useful native trailers for constraints, rejected alternatives, confidence, scope risk, directives, tests, and gaps.
5. Validate the message and create one coherent commit.
6. Report commit identifier, committed scope, and verification recorded.

## Stop conditions

- Stop for missing authorization, ambiguous scope, unrelated staged changes, or failed message validation.
- Stop after creating the commit unless another action is separately authorized.

## Required output

Report the commit identifier, intent, included files, and recorded verification.

## Verification

Check the staged diff and final commit metadata against the authorized scope before reporting success.

## Boundaries

Never push, tag, publish, release, amend unrelated history, or create extra commits without separate authorization.
