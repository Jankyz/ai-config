# Migration and dogfooding

Phase 9 exposes a deliberately small operational CLI:

```bash
ai-config setup --provider codex [--apply]
ai-config setup --provider codex --replace-conflict <artifact-id>
ai-config setup --provider codex --replace-conflict <artifact-id> --approve-preview <fingerprint> --apply
ai-config update --provider codex [--apply]
ai-config doctor [--provider codex]
ai-config rollback --provider codex --transaction <uuid> [--apply]
```

`setup`, `update`, and `rollback` are read-only previews unless `--apply` is supplied. Provider
selection is explicit for all mutation-capable commands. A preview never creates provider files,
state, receipts, backups, or locks.

`setup` plans canonical global instructions and skills through the provider adapter. Unrelated
content is never planned. A regular canonical target can be `ADOPT`ed only when its bytes and mode
exactly match the desired artifact; adoption records ownership without rewriting the file. Different
content, symlinks, unsupported objects, active overrides, invalid state, and recovery evidence
block mutation. Once adopted, an explicitly applied future update may replace the artifact through
the normal managed transaction path.

A differing unmanaged canonical target remains `CONFLICT` by default. The setup-only
`--replace-conflict <artifact-id>` option authorizes replacement of exactly that desired artifact;
preview reports `REPLACE_UNMANAGED_APPROVED` plus an `APPROVAL_FINGERPRINT`. The fingerprint binds
the provider, operation mode, explicit replacement set, and complete material action evidence while
excluding transaction IDs and other volatile process data. Mutation requires the unchanged preview
fingerprint through `--approve-preview <fingerprint>` as well as `--apply`. A mismatch returns
`PREVIEW_CHANGED` before creating transaction state. Apply
revalidates the exact observed regular file, backs up its bytes and mode, and records managed
ownership. The transaction can be rolled back to the exact prior bytes and mode. Authorization is
not inherited by any other or newly discovered conflict.

`update` requires valid existing ownership state and fails closed for drift, conflicts, or recovery
state. `doctor` reports runtime/package metadata, source registry/lock health, provider readiness,
and planned drift/conflict status without changing anything. `rollback` names a single committed
transaction and refuses rollback when later/incomplete ownership state would make the reversal
unsafe. Adoption-only rollback removes ownership state while preserving the original file.

Real-provider migration is a separate owner-approved action. A read-only preview and doctor audit
do not authorize `--apply`.
