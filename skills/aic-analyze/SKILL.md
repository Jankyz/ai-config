---
name: aic-analyze
description: Perform read-only repository analysis and explain evidence-backed current state when explicitly invoked.
---

# Repository analysis

## Purpose

Explain how the current repository works, what a change affects, and where constraints or dependencies exist.

## Preconditions

- Read repository instructions and relevant durable documentation.
- Establish the question, scope, and the decision the analysis supports.

## Procedure

1. Inspect relevant source, configuration, tests, history, and documentation.
2. Trace data flow, ownership, call relationships, and observable behavior as needed.
3. Cite precise file locations for material evidence.
4. Separate observed behavior from reasonable inference.
5. Identify constraints, likely affected areas, and unresolved facts.
6. Recommend a next step only when the evidence supports it.

## Stop conditions

- Stop before editing files, applying fixes, or expanding into implementation.
- Escalate material ambiguity through an explicit decision workflow.

## Required output

Report current state, evidence, dependencies, risks, confidence, and recommended next action.

## Verification

Check that each material claim is supported by an inspected location and that no repository file was changed.

## Boundaries

This is read-only analysis; it does not create a plan or modify the repository.
