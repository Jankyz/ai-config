# Upstream resources

`registry.json` records the human-reviewed sources and resource intent. `lock.json` records the immutable
commits, versions, resource digests, and exact license-evidence digests that a future installer may consume.
The registry and lock must validate as one consistent pair. Tracking branches are only update-discovery
inputs; setup must never install from a moving reference.

The selected Matt, UI UX Pro Max, shadcn, and 21st resources are explicitly classified in the registry. External-managed snapshots remain byte-identical to their locks; adapted resources retain their provenance while ai-config owns their local behavior. Setup never follows a moving upstream reference or executes an upstream installer. See [external source architecture](../docs/architecture/external-sources.md).
