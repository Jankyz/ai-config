---
name: aic-implement
description: Execute an approved implementation plan autonomously and within scope when explicitly invoked.
---

# Approved-plan implementation

## Purpose

Deliver an approved change safely, using the plan as the execution contract.

## Preconditions

- An approved plan exists and explicitly permits implementation.
- The plan has no material open decisions.
- Current repository state and project instructions have been inspected.

## Procedure

1. Restate the approved scope, constraints, and required verification.
2. Implement the planned sequence using established project patterns.
3. Keep changes narrow; preserve unknown or user-owned content.
4. Run the automated checks required by the plan and fix recoverable implementation failures.
5. Review the resulting diff for scope, safety, and unintended behavior.
6. Report exact changes, evidence, known gaps, and required manual verification.

## Stop conditions

- Stop the affected branch for a new material decision, invalidated assumption, destructive action, or required manual gate.
- Return failed verification to implementation rather than declaring success.

## Required output

Provide changed files, verification evidence, remaining risks, and manual gates.

## Verification

Review the final diff against the approved scope and confirm that each planned automated check has been run or reported as blocked.

## Boundaries

Never redesign the approved work, silently expand scope, commit, push, publish, or release.
