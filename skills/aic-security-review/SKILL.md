---
name: aic-security-review
description: Perform a focused, read-only security review of relevant attack surfaces when explicitly invoked.
---

# Focused security review

## Purpose

Assess the security-relevant attack surfaces of a defined change or system without turning every task into a generic checklist.

## Preconditions

- Define the assets, trust boundaries, attacker capabilities, and change scope.
- Read relevant architecture, code, configuration, and security requirements.

## Procedure

1. Identify inputs, identities, permissions, data flows, and external integrations in scope.
2. Trace how untrusted data crosses boundaries and how sensitive assets are protected.
3. Evaluate concrete risks such as authorization failures, injection, secret exposure, unsafe filesystem use, and integrity loss when relevant.
4. Validate findings with code or configuration evidence.
5. Describe impact, exploit conditions, severity, and a proportionate correction.
6. State residual risk and tests that should accompany any remediation.

## Stop conditions

- Stop before modifying code, credentials, production settings, or external accounts.
- Escalate material security decisions that require owner acceptance.

## Required output

Report scoped findings with severity, evidence, impact, recommendation, and residual risk.

## Verification

Check that each finding follows from an in-scope trust boundary or attack surface and includes a proportionate correction.

## Boundaries

This is focused read-only analysis, not a substitute for implementation or a broad compliance claim.
