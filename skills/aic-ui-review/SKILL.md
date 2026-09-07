---
name: aic-ui-review
description: Compare current screenshots with approved visual references and return a structured read-only verdict.
---

# Visual review

## Purpose

Compare current or generated screenshots against one or more approved visual references. This is a structured review heuristic, not a pixel-perfect mathematical guarantee.

## Required evidence

- Current or generated screenshot evidence.
- One or more approved visual reference images.

If either is unavailable, return exactly:

`BLOCKED — visual evidence unavailable`

Do not infer a visual comparison from source code alone.

## Procedure

1. Compare observable layout, spacing, typography, sizing, hierarchy, color, and component styling.
2. Assess responsive differences only where the supplied evidence supports them.
3. Identify material differences and actionable suggestions without editing implementation files.
4. Return this structure:

```text
score: 0-100
verdict: PASS | REVISE | FAIL
category_match: boolean
differences[]
suggestions[]
summary
```

Use `PASS` only when the score is at least 90. Use `REVISE` for remediable gaps below that threshold and `FAIL` when the evidence shows a materially wrong category or direction.

## Boundaries

- This skill is read-only.
- Do not modify project files, create an implementation loop, or automate screenshots.
- Do not create plans, bypass approval, commit, push, or release.
- Do not introduce runtime state, external tools, credentials, or model-specific instructions.
