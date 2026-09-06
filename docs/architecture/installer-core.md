# Installer core

Phase 2 manages provider-neutral regular-file artifacts through `planInstall(context, desired)` and `applyInstallPlan(context, plan)`. The context supplies explicit home, state, and allowed target roots. Core operations never resolve writable locations from HOME or the process working directory. The public CLI remains help/version only.

## Paths and file scope

Caller target paths must be absolute before normalization. Targets must lie strictly inside an allowed root and must not overlap the installer state root (including its descendants). An existing artifact ID cannot move to another target; target migration and adopted merging remain deferred.

Every existing path component is inspected with `lstat`, including ancestors above allowed roots and the state root. Symlinks and unexpected file types are rejected. The caller must supply physical paths without symlink aliases; for example, a macOS temporary-directory alias must be canonicalized explicitly by the test fixture before constructing its context. Core does not automatically follow or resolve symlinks.

Allowed roots and the state root may be absent only when their immediate parent already exists as a safe directory. Missing target directories are created one at a time, within the allowed root, and tracked only on successful creation. Rollback uses non-recursive `rmdir` and leaves nonempty directories intact. Installer metadata containers use the explicit state root. State layout checks cover `state.json`, `lock.json`, `receipts/`, `backups/`, and each actual receipt/backup path before use.

The implementation targets local POSIX filesystems. It rejects special permission bits and does not manage uid/gid, ACLs, extended attributes, resource forks, or recursive directory ownership.

## Ownership, state, and planning

Desired artifacts carry a stable opaque ID, target path, exact bytes (or UTF-8 string), managed ownership intent, and optional permission mode in `0000–0777`. SHA-256 hashes represent exact bytes without normalization. Existing unknown content always conflicts, even when its bytes equal desired content.

State schema v1 records `id`, normalized absolute `targetPath`, `ownership` (`managed` or `adopted`), lowercase 64-hex `contentHash`, optional `mode`, and `lastTransactionId`. State contains metadata only. Invalid structure, unsupported schema, malformed hashes/modes/paths, and duplicate targets are rejected. Adopted records are represented but generic adopted writes conflict.

Planning is read-only and ordered by artifact ID. It returns actions `CREATE`, `REPLACE_MANAGED`, `RECREATE_MISSING_MANAGED`, and `NOOP`, plus structured blocking conflicts. A conflict blocks the entire plan.

Each action captures the complete expected ownership record (or null), observed classification, expected hash/absence, observed mode, intended mode, and any managed mode. Apply recomputes and compares every action under an exclusive lock before preparing transaction metadata or writing targets. This includes NOOP actions in a changing transaction. Removed ownership, adopted ownership, moved records, changed classifications, bytes, or modes cause `STALE_PLAN`. Preconditions are checked again before each write and immediately before publication. Written targets and NOOPs are checked again before commit. All-NOOP and empty plans perform no mutation.

A recorded mode participates in drift detection. Changing it locally conflicts. Changing desired mode intentionally produces a managed replacement, including a mode-only change. Once recorded, managed mode remains applicable when subsequent desired inputs omit it. Unmanaged modes are preserved on replacement; new files default to `0644`.

## Logical transactions and recovery

Each changing plan uses a validated UUID v4. IDs containing separators/traversal or previously used IDs are rejected before receipt/backup reuse. One `lock.json` per state root is created with `wx` and mode `0600`. Existing locks are never automatically removed. Release verifies the lock identity and bytes before unlinking it.

Under the lock, apply checks old receipts, captures the exact prior state bytes/mode/absence, and completes semantic preflight. It then writes a prepared receipt and, if prior state exists, a private `state-before.bin` backup. The receipt moves to applying before target writes. Replacement backups are persisted and referenced in the receipt before the target is changed.

Temporary files use UUID names and exclusive `wx` creation. Both target and JSON writes use the same atomic primitive. Managed replacements use same-directory rename. Absent targets are published with a hard link from the completed temporary file, then the temporary name is unlinked; an unexpected existing target causes failure instead of replacement. File modes are set explicitly on the temporary descriptor.

After publication succeeds, the target's inode/device, hash, and mode enter the in-memory rollback journal before post-write verification. Rollback removes a created target or restores a replacement only while the current file still matches that transaction evidence. An unrelated replacement or local edit is preserved and requires recovery.

Only after target verification succeeds is new state atomically persisted. The exact prior state is restored on handled failures after state persistence, including final receipt failure; first-run rollback restores state-file absence. Rollback verifies restored bytes and modes. Failure to restore state or targets, or to persist recovery evidence, returns `RECOVERY_REQUIRED` and retains the lock and backups. A successful rollback ends in a rolled_back receipt. Uncertain recovery uses failed; malformed receipts, unsupported schemas, and prepared/applying/failed statuses block later mutation. Only validated committed and rolled_back receipts are safe terminal records.

## Persisted layout and receipt fields

```text
<stateDir>/
├── state.json
├── lock.json
├── backups/<transaction-id>/
│   ├── state-before.bin       # only when prior state existed
│   └── <action-index>.bin     # only for replacements
└── receipts/<transaction-id>.json
```

Receipts have `schemaVersion: 1`, UUID `transactionId`, UTC ISO timestamps, status, and per-action metadata: artifact ID, normalized target path, action, optional before hash/mode, after hash/mode, and optional indexed backup filename. `previousState` is null for first run or records the prior state hash, original mode, and fixed backup filename. Older valid v1 receipts without the additional mode/previous-state fields remain readable.

All backup bytes use explicitly enforced `0600`; original target modes are preserved separately as `beforeMode`. JSON metadata also uses `0600`. Contents are never embedded in receipts/state JSON. Backups and receipts are retained; there is no retention cleanup or recovery CLI.

These are logical transactions, atomic per-file replacement, and same-process best-effort rollback—not filesystem-wide ACID transactions. Path checks and lock coordination reduce but cannot eliminate races with unrelated processes between checks and rename/link/unlink. Locks coordinate installers sharing one state root, not arbitrary external writers. Device/inode/hash/mode checks detect ordinary replacement races but are not an adversarial filesystem isolation boundary. There is no fsync-based power-loss durability guarantee or automatic crash recovery. Uncertain persisted evidence requires explicit recovery.

Filesystem primitives follow the [Node.js 24 filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html), including exclusive creation, descriptor reads, link, and rename semantics.
