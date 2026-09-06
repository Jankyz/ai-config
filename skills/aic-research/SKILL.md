---
name: aic-research
description: Conduct bounded, evidence-backed external or domain research when explicitly invoked.
---

# Evidence-backed research

## Purpose

Answer a defined research question with current, relevant evidence while distinguishing established facts from inference.

## Preconditions

- Establish the question, intended decision, scope, and relevant time horizon from the prompt, project context, and existing material first.
- Read relevant project instructions and existing research first.

## Procedure

1. Restate the research question and the decision it informs.
2. Identify authoritative primary sources, then use secondary sources only for context or gaps.
3. Record source, publication date, relevant claim, and limitations for each material fact.
4. Compare evidence, noting agreement, uncertainty, and meaningful conflicts.
5. Separate facts, assumptions, and recommendations in the result.
6. Create `docs/research/` material only when durable output is requested or materially useful.

## Stop conditions

- Ask the owner only when a material ambiguity remains that cannot be resolved independently.
- Stop if the question requires an owner value judgment rather than further evidence.
- Stop if reliable evidence cannot establish a required conclusion; report the uncertainty.

## Required output

State the question, evidence, findings, confidence, limitations, and recommendation. Cite sources directly.

## Verification

Check that every material conclusion is traceable to a cited source and that inference is labeled.

## Boundaries

Do not modify product code, configuration, or implementation plans.
