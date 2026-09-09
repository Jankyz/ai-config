# Improve mode

Improve mode preserves parts of the product that work while allowing weak areas to be redesigned. Prefer targeted
improvements over a broad redesign unless the evidence shows a foundational system problem.

Before adding a major pattern, inspect existing project patterns, consult UI UX Pro Max, use `$aic-ui-components` or
`$aic-ui-generate` for relevant 21st evidence, and consult `$aic-shadcn` when appropriate. Decide explicitly whether reuse, adaptation, or a custom
solution fits best. Avoid new dependencies unless they are technically justified and within the user’s scope.

Improvements may adjust or replace components, palette, typography, spacing, hierarchy, screen structure, responsive
behavior, interaction states, navigation, or tokens. Keep product behavior intact unless the requested UX improvement
requires a change.

Implement in meaningful, reviewable phases. After each phase, visually verify the rendered result at representative
widths and inspect relevant default, hover, focus, active, disabled, loading, empty, error, and success states. Correct
visual defects before treating the next phase as stable.

Report what changed, the user/product problem it addresses, the design rationale, the validation performed, and
remaining tradeoffs or risks.
