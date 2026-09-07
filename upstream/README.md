# Upstream resources

`registry.json` records the human-reviewed sources and resource intent. `lock.json` records the immutable
commits, versions, resource digests, and exact license-evidence digests that a future installer may consume.
The registry and lock must validate as one consistent pair. Tracking branches are only update-discovery
inputs; setup must never install from a moving reference.

The initial Matt Pocock Skills and Oh My Codex registrations are reference-only. They fetch, install,
vendor, execute, and activate nothing. See [external source architecture](../docs/architecture/external-sources.md).
