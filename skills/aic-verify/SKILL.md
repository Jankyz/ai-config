---
name: aic-verify
description: Run evidence-based final verification against an approved plan without fixing failures when explicitly invoked.
---

# Evidence-based verification

## Purpose

Establish whether completed work satisfies its approved definition of done using relevant, reproducible evidence.

## Preconditions

- Read the approved plan, definition of done, implementation summary, and relevant project instructions.
- Identify the exact success conditions and available verification methods.

## Procedure

1. Derive the smallest appropriate check set from the approved plan.
2. Run applicable tests, type checks, linting, builds, static analysis, runtime checks, and required reviews.
3. Read the outputs and map each result to a success condition.
4. Confirm required manual verification and explain how the owner can perform it.
5. Report failures with evidence and return them to implementation.
6. Record known gaps rather than inferring untested behavior.

## Stop conditions

- Stop before editing code to repair a failure.
- Stop at required owner-only manual or account-bound verification.

## Required output

Report commands or checks, pass/fail evidence, manual gates, and known gaps.

## Verification

Check that every definition-of-done condition has either evidence, a failed result, or an explicitly stated manual gate.

## Boundaries

Verification is read-only; it does not silently fix failures or create commits.
