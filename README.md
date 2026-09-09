# ai-config

`ai-config` is a reproducible environment manager for AI coding agents. It applies a reviewed, provider-aware baseline of instructions, workflow skills, verified external resources, and managed tools without taking over the rest of your environment.

## What ai-config is

It turns a reviewed AI-agent setup into a previewable, repeatable operation. Codex is the primary provider; Claude Code is also supported. The canonical workflow remains provider-neutral.

## Why it exists

Agent environments tend to drift as skills, local conventions, and tools are copied between machines. ai-config makes the intended pieces explicit, tracks what it owns, and uses locked dependency identities so setup and update are reviewable rather than an implicit adoption of whatever is latest upstream.

## Quick start

Preview the planned Codex setup first:

```bash
npx ai-config setup --provider codex
```

Apply only after reviewing the preview:

```bash
npx ai-config setup --provider codex --apply
```

Check the environment and preview or apply updates with:

```bash
npx ai-config doctor --provider codex
npx ai-config update --provider codex
npx ai-config update --provider codex --apply
```

## Preview vs `--apply`

`setup`, `update`, and `rollback` are previews by default. They mutate files only with `--apply`. If setup finds a differing file in an artifact it does not own, it reports a conflict and will not force-overwrite it. An exceptional replacement requires both the named `--replace-conflict <artifact-id>` and the exact preview fingerprint:

```bash
npx ai-config setup --provider codex --replace-conflict codex.global.instructions
npx ai-config setup --provider codex --replace-conflict codex.global.instructions --approve-preview <fingerprint> --apply
```

## What setup installs

ai-config installs its global canonical instructions, native/adapted workflow skills, approved external-managed skills, an exact managed-tool version, and its own state, receipts, and backups.

## Update

`update` reconciles only artifacts already managed or adopted by ai-config. It previews by default and does not update the `ai-config` npm package itself.

## Doctor

`doctor` is read-only. It checks the lock metadata, provider plan health, and the availability of optional external capabilities.

## Rollback

Every applied operation has a transaction ID. Preview or restore one explicitly:

```bash
npx ai-config rollback --provider codex --transaction <uuid>
npx ai-config rollback --provider codex --transaction <uuid> --apply
```

## Ownership boundaries

ai-config manages its desired artifacts and state, but does not automatically take ownership of provider authentication, Codex `config.toml`, arbitrary plugins, arbitrary MCP configuration, unrelated user skills, or project dependencies.

## Dependency model

**Native / adapted** resources are packaged with ai-config. They include canonical ai-config workflow skills and `aic-product-design-lead`, `aic-tdd`, `aic-domain-modeling`, `aic-shadcn`, `aic-ui-components`, and `aic-ui-generate`.

**External-managed** resources—`codebase-design`, `writing-for-agents`, and `ui-ux-pro-max`—are acquired during setup/update from immutable identities in the packaged lock metadata. Their runtime bytes are not bundled in ai-config.

The managed tool is `@21st-dev/cli@1.17.0`, acquired at its exact locked npm identity.

## External capabilities

ai-config does not install or authenticate OpenAI Product Design, browser/computer-use capability, project-owned Playwright (or equivalent), 21st authentication/quota, or a Python runtime. It can report when some of these are unavailable.

## Supported providers

Use `--provider codex` or `--provider claude` with setup, update, and rollback. `doctor` may check one provider or both.

## Safety model

The workflow is preview-first; `--apply` is required for mutation. ai-config detects conflicts, has no force-overwrite mode, tracks managed ownership, writes transaction backups for rollback, verifies locked dependency integrity, and never automatically adopts an upstream “latest” release. These controls reduce risk; they are not a substitute for reviewing a plan before applying it.

## Known compatibility status

Phase 9/9.1 dogfood passed on macOS with Codex and Node v26.3.0. Independent public-package verification on Node.js 24 and through Bun/bunx is intentionally post-release work; neither has been claimed as verified.

Post-release checklist:

- Verify the public package on actual Node.js 24.
- Verify the public package through Bun/bunx.

## Development and contributing

Install dependencies with `npm ci`, then run `npm run check` and `npm run pack:check`. The repository’s architecture and approved plans are in [docs/architecture](docs/architecture/README.md) and [docs/plans](docs/plans). Contributions should preserve preview-first behavior, ownership boundaries, and locked dependency review.

Maintainers: see [docs/RELEASING.md](docs/RELEASING.md) for the one-time 0.1.0 bootstrap and the subsequent OIDC-only release flow.
