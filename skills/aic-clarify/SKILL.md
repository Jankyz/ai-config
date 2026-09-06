---
name: aic-clarify
description: Resolve genuine material decisions through evidence and concise owner questions when explicitly invoked.
---

# Decision clarification

## Purpose

Resolve uncertainty that materially affects product behavior, architecture, security, data, APIs, scope, or irreversible actions.

## Preconditions

- Read the relevant project documentation, plan, and implementation state.
- Identify the concrete decision that is blocking safe progress.

## Procedure

1. Establish every fact that repository inspection or research can answer.
2. Separate routine implementation details from material owner decisions.
3. Define feasible options and their consequences.
4. Recommend one option using the available evidence and project constraints.
5. Ask only for the owner judgment that remains necessary.
6. Clearly report the resolved owner decision, and state which durable project artifact should record it when relevant.

## Stop conditions

- Stop before implementation, mutation, or a speculative decision.
- Stop once the owner decision is recorded clearly enough for planning or execution.

## Required output

Provide the decision, facts, options, recommendation, trade-offs, and exact owner decision required.

## Verification

Check that the question cannot be answered independently and that the recommended choice addresses the stated constraint.

## Boundaries

Do not modify repository files, implement code, or silently convert a preference into a project decision. Leave any artifact update to an appropriately authorized planning, implementation, or documentation action.
