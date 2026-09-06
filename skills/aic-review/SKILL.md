---
name: aic-review
description: Perform a focused, read-only implementation or code review when explicitly invoked.
---

# Implementation review

## Purpose

Find concrete defects, regression risks, and contract violations in an implementation without modifying it.

## Preconditions

- Read the approved plan, relevant project instructions, and the changed implementation.
- Establish the review scope and expected behavior.

## Procedure

1. Inspect the diff and affected code paths, tests, interfaces, and documentation.
2. Check behavior against the approved requirements and established project patterns.
3. Look for correctness, security, compatibility, maintainability, and verification gaps relevant to the change.
4. Validate each finding with a precise location and concrete impact.
5. Rank findings by severity and describe the smallest appropriate correction.
6. State clearly when no actionable findings are supported by the evidence.

## Stop conditions

- Stop before editing files or converting review comments into implementation.
- Do not report speculative concerns without evidence and impact.

## Required output

List findings with severity, location, evidence, impact, and recommended correction.

## Verification

Check that every finding is actionable, scoped to the review, and supported by a precise location.

## Boundaries

This is read-only review, not verification, implementation, or a generic checklist exercise.
