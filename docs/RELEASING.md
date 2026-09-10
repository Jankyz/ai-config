# Releasing @jankyz/ai-config

## Historical bootstrap: 0.1.0

`@jankyz/ai-config@0.1.0`, tag `v0.1.0`, and GitHub Release `v0.1.0` are the historical first-public-release baseline. The owner manually bootstrapped that npm publication; Trusted Publishing was configured afterward. Do not republish, stage, retag, or recreate that release.

## One-time npm Trusted Publishing setup for the next new version

The previous Trusted Publisher connection allowed staged publishing but not direct publication. Before the next new version:

1. Remove the stage-only Trusted Publisher connection for `publish.yml`.
2. Create it again for GitHub owner `Jankyz`, repository `ai-config`, and workflow filename `publish.yml`.
3. Enable **Allow npm publish**.
4. Keep the workflow OIDC-only; do not create an npm token.

This is an npm-account action for the owner. The repository contains no npm credential, OTP secret, or token configuration.

## Future release process

1. Bump the package version.
2. Commit the release changes to `main` and push `main`.
3. Create an annotated tag `vX.Y.Z` and push that tag.
4. `release-draft.yml` checks out the pushed tag, verifies its identity and all release gates, then creates a GitHub **Draft Release** for that exact tag.
5. The new draft uses GitHub-generated release notes, preceded by ai-config install preview/apply commands and the actual package version.
6. Open the Draft Release, review it, and optionally edit its generated description.
7. Click **Publish release** manually on GitHub. This is the final human publication approval gate.
8. The GitHub `release.published` event triggers `publish.yml`.
9. `publish.yml` checks out the exact released tag, repeats the release verification, checks the exact public package version, and publishes directly with npm Trusted Publishing/OIDC only when that version is absent.
10. Verify `@jankyz/ai-config@X.Y.Z` in the public npm registry.

Maintainers do not normally write release notes from scratch, run `npm publish`, run `npm login` for release automation, manage npm tokens, or approve staged packages. There is no tag-push npm publication and no staged-publishing step.

## Safe reruns

If a Release already exists for a tag, the draft workflow preserves it. An existing draft reports `RELEASE_DRAFT_ALREADY_EXISTS vX.Y.Z`; an existing published Release reports `RELEASE_ALREADY_PUBLISHED vX.Y.Z`. Neither title nor body is overwritten, and no Release is converted back to draft.

If the exact public package version is already present, `publish.yml` reports `PACKAGE_ALREADY_PUBLISHED @jankyz/ai-config@X.Y.Z` and does not run `npm publish`. Any registry result other than an explicit exact-version-not-found response reports `REGISTRY_CHECK_FAILED` and fails closed.
