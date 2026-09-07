# External sources

`upstream/registry.json` records reviewed source intent. `upstream/lock.json` records only immutable
resolutions used by future consumers. A source is an upstream repository or npm package; a resource is a
specific declared path within it. Registering a source never activates or installs its full contents.

Resources are `reference`, `external-managed`, `vendored`, or `adapted`. Reference resources are only
tracked. External-managed resources must match their locked digest before use. Vendored bytes must remain
identical to their lock. Adapted resources are locally authoritative and upstream changes are review input.

GitHub installs resolve to full commit SHAs and npm metadata resolves to exact versions with valid SRI.
Registry and lock are validated together before consumption. Consumable resources carry SHA-256 tree
digests, and each lock pins the exact license-evidence bytes and actual resolution time.

HTTPS responses are size-bounded while streaming, redirects are disabled, and GitHub blobs use the raw
media representation so decoded file limits are exact. Download caches are disposable, private, confined
to an explicit physical root, reject symlinks, and are revalidated against the expected tree digest.

An update check only compares a tracked ref to its lock. Updating a lock, vendor, or adaptation is a
reviewed repository change. Acquisition treats remote data as data only: it never executes downloaded
scripts, package binaries, lifecycle hooks, or installers.
