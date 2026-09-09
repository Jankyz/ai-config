# Releasing ai-config

## First public publication: 0.1.0

`0.1.0` is a one-time manual bootstrap. Follow this order:

1. Prepare and approve the exact `0.1.0` release artifact.
2. Manually publish that exact reviewed tarball with the owner's npm account and 2FA.
3. Configure npm Trusted Publishing for `Jankyz/ai-config` and the exact workflow filename `publish.yml`.
4. Create and push `v0.1.0`, then create the GitHub Release.
5. The workflow verifies `v0.1.0`, recognizes `ai-config@0.1.0` as already published, and completes without a duplicate publish.
6. Future new versions are published by the same workflow through OIDC.

For every tagged release, the workflow verifies the exact package version at the public npm registry after release checks. A missing version is published through OIDC. An existing version reports `PACKAGE_ALREADY_PUBLISHED` and is not republished. Unexpected registry failures fail the workflow.

Future releases use OIDC only through that workflow. It uses no npm token and npm automatically generates provenance for public packages published by the configured GitHub-hosted workflow.

The manual 0.1.0 bootstrap does not receive CI-generated npm provenance.
