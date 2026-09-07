# Upstream resources

`registry.json` records the human-reviewed sources and resource intent. `lock.json` records the immutable
commits, versions, resource digests, and exact license-evidence digests that a future installer may consume.
The registry and lock must validate as one consistent pair. Tracking branches are only update-discovery
inputs; setup must never install from a moving reference.

Matt Pocock Skills and Oh My Codex are reference-only. They fetch, install, vendor, execute, and activate nothing. The two selected 21st resources are adapted into local canonical UI skills; their pinned revision and resource digests are review input for future changes. See [external source architecture](../docs/architecture/external-sources.md).
