# Audit mode

Audit mode is read-only unless the user explicitly authorizes changes. Inspect the real application with browser tooling
when possible; source review alone is insufficient when the product can run.

Assess the product hierarchy, information architecture, navigation, primary flows, visual hierarchy, layout, spacing,
typography, colors, components, consistency, interaction states, empty/loading/error/success states, responsive
behavior, keyboard use, accessibility, and touch targets. Use the product context to decide which areas matter most; do
not inflate the audit with irrelevant categories.

Report strengths as well as problems. Prioritize meaningful findings as Critical, High, Medium, or Low. For each finding
include:

- the observed issue and its classification (UX, visual UI, accessibility, responsive, or consistency);
- why it matters to users or the product;
- evidence, such as an observed screen, interaction, or implementation detail, when available; and
- a recommended direction, not an ungrounded pixel-level prescription.

Distinguish objective defects and usability risks from subjective aesthetic preferences. Do not manufacture findings to
appear comprehensive. End with the highest-leverage next actions and clearly state that no application code was changed.
