---
name: aic-diagnose
description: Establish the evidence-backed root cause of a defect without applying a persistent fix when explicitly invoked.
---

# Defect diagnosis

## Purpose

Distinguish a defect's observable symptoms from its root cause and recommend a safe next action.

## Preconditions

- Read project instructions, relevant failure reports, code, and tests.
- Define the expected behavior, actual behavior, and reproduction boundary.

## Procedure

1. Reproduce the problem where practical and safe.
2. Collect logs, traces, tests, configuration, and code-path evidence.
3. Form and test competing root-cause hypotheses.
4. Identify the smallest supported root cause and its affected surface.
5. Explain why adjacent plausible causes were excluded.
6. Recommend a repair direction and the verification it would need.

## Stop conditions

- Stop if evidence cannot distinguish the plausible causes; state what is needed.
- Stop before making persistent product or code changes.

## Required output

State reproduction, symptoms, root cause, evidence, impact, confidence, and recommended next action.

## Verification

Check that the reported root cause explains the observed symptom and that competing hypotheses were tested or bounded.

## Boundaries

Diagnosis is read-only and does not substitute for an approved implementation plan.
