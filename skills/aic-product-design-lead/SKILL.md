---
name: aic-product-design-lead
description: Audit, improve, redesign, restyle, or visually polish product UI/UX through explicit, evidence-based product design work.
---

# Product Design Lead

Create product-specific, usable interfaces rather than generic “modern” UI. This skill covers product UX and visual UI quality; it does not prescribe a framework, component library, or visual style.

## Preconditions

- This skill is explicitly invoked.
- Read repository instructions, the approved plan when changes are requested, the existing application and source, and `DESIGN.md` when present.
- Keep audit work read-only unless the user separately authorizes changes. Material design changes require an approved implementation plan.

## Choose the mode

Use a user-specified mode. Otherwise infer it from the request:

- **Audit** for review, inspection, critique, or UI/UX audit requests. Read [audit mode](references/audit.md).
- **Improve** for requests to fix, polish, improve, or make an interface feel more human. Read [improve mode](references/improve.md).
- **Redesign** for a new visual direction, restyle, or substantial design change. Read [redesign mode](references/redesign.md).

When a request genuinely combines modes, do the audit or discovery work needed to ground the next mode while respecting the user’s authorization for code changes.

## Establish context before deciding

Inspect the existing product and implementation before recommending or changing design. Establish what can be learned from the request and codebase about:

- product type, target users, primary goals, important flows, and desired personality;
- existing brand language, technical stack, components, tokens, architecture, and durable `DESIGN.md` guidance; and
- the problem type: UX, visual UI, accessibility, responsiveness, consistency, or subjective preference.

Preserve strong product-specific choices, but do not retain a weak pattern merely because it already exists. Significant recommendations and changes must identify the user or product problem they solve and any meaningful tradeoff.

## Use complementary design evidence

For substantial work, inspect the application and its source first. Then use focused complementary evidence where it adds value:

1. Use OpenAI Product Design for product-level reasoning, flows, IA, audits, visual ideation, or redesign discovery when available. Use its focused audit workflow for audits and its context/ideation workflow for substantial redesign discovery.
2. Use `ui-ux-pro-max` local search for heuristics, accessibility, typography, palette, spacing, layout, and design-system decisions when Python-backed search is available. If it is unavailable, state the reduced evidence and use project guidance rather than installing Python.
3. Use `$aic-ui-components` and `$aic-ui-generate` for 21st component discovery and concept exploration. Do not duplicate their operational instructions, install the CLI, authenticate it, or consume paid operations without authorization.
4. Consult `$aic-shadcn` only when shadcn primitives, registries, or existing project configuration are relevant. Do not assume the project uses shadcn.
5. Use Browser, project-owned Playwright, or equivalent rendered-state tooling when available to inspect layout, responsive behavior, and interaction states. Do not install browser tooling globally or into a project merely for this skill.

Treat every tool as a source of hypotheses or references, never as the sole source of truth. Synthesize evidence against the product, users, brand, codebase, `DESIGN.md`, architecture, and stack. Do not introduce React, Tailwind, shadcn, or any dependency merely because it was consulted.

## Design standards

Prefer strong hierarchy, deliberate typography, purposeful spacing, appropriate density, clear affordances, predictable navigation, accessible contrast, semantic color, and content-first composition. Every significant visual element should earn its place.

Avoid defaulting to AI-SaaS or demo aesthetics: nested cards, excessive rounded rectangles or pills, arbitrary gradients, gratuitous glass, shadows, whitespace, badges, icons, animation, dashboard layouts, muted text, or decorative complexity. Do not make a UI “modern” merely to follow fashion.

Derive visual direction from the product category, audience, context, personality, content density, and accessibility needs. Give major colors deliberate semantic roles: background/surface, primary action, secondary accent, success, warning, danger, information, and focus.

Treat accessibility as a design input: semantic structure, keyboard use, focus visibility and management, accessible names, contrast, touch targets, reduced motion, screen-reader states, color-independent meaning, and zoom/reflow.

## Durable guidance and verification

Read an existing `DESIGN.md` and follow it unless the selected mode intentionally changes it. Audit mode may propose one; improve mode may create one only when an approved scope authorizes durable documentation; redesign mode should establish or update it after a direction is chosen.

Do not call meaningful UI work complete because it compiles. Inspect the rendered UI, important interaction states, and representative responsive widths. Use approximately 320, 390, 768, 1024, and 1280 px where applicable, adapting the matrix to the product. Iterate when the result does not meet the intended hierarchy, usability, or selected visual direction.

## Boundaries

- No OMX, team, swarm, Ralph, pipeline, keyword-routing, MCP configuration, or personal filesystem assumptions.
- No implementation, dependency change, commit, publish, or release outside approved scope.
- External Product Design and browser capabilities improve evidence when available; their absence is not a blanket blocker.
