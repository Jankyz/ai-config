---
name: aic-plan
description: Produce a scoped implementation plan for a material approved change when explicitly invoked.
---

# Implementation planning

## Purpose

Create an execution contract that lets an implementation agent work autonomously without reopening material decisions.

## Preconditions

- Inspect the current repository, relevant tests, documentation, and existing plans.
- Resolve independently answerable questions before involving the owner.

## Procedure

1. Define goal, current state, requirements, confirmed decisions, and constraints.
2. State scope, out-of-scope work, affected areas, and external or data/API impact.
3. Define a sequenced implementation approach using existing patterns where practical.
4. Specify automated checks, manual verification, security considerations, risks, and rollback or recovery.
5. Define completion criteria and record every open decision.
6. Mark the plan as draft until the owner explicitly approves implementation.

The skill may create or update the implementation plan artifact. It may not mutate implementation or product files; creating a draft plan is not implementation authorization.

## Stop conditions

- Material open decisions block implementation.
- Stop after presenting the plan; do not mutate implementation files.

## Required output

Provide the plan artifact path, concise summary, open decisions, and approval request.

## Verification

Check that the plan itself contains scope, confirmed decisions, implementation sequence, tests, risks and recovery, definition of done, and an explicit open-decision gate.

## Boundaries

Do not implement, commit, or treat a draft as authorization.
