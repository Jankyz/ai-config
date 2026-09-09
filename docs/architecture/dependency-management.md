# Dependency management

Phase 9.1 uses the existing `upstream/registry.json` and `upstream/lock.json` as the only dependency manifest and lock. A source identifies reviewed upstream intent; a resource identifies one consumable skill or tool. Setup consumes only immutable commits, exact npm versions, verified resource digests, and verified license evidence.

Dependencies are classified as native, adapted, external-managed, managed-tool, or external-capability. Native and adapted skills are canonical ai-config assets. External-managed resources are acquired from their locked immutable GitHub revision during setup/update, then checked against both license evidence and the locked tree digest before installation. Provider-specific rendering is allowed only where an upstream resource requires it; UI UX Pro Max data and scripts remain unchanged while its entry point is rendered from locked templates.

The managed 21st CLI is `@21st-dev/cli@1.17.0`. Setup/update resolves exact npm metadata, permits only the registry-declared HTTPS tarball URL, validates its locked SRI, safely extracts expected regular package files, and installs them under `~/.ai-config/tools/21st/1.17.0/`. A managed launcher under `~/.ai-config/bin/21st` resolves that exact version. No global npm install, `npx` fallback, authentication, or MCP configuration is used.

Setup and update use normal managed ownership, backup, drift detection, and rollback receipts. A changed managed external skill or managed tool blocks replacement. `doctor` validates registry/lock health, managed-artifact convergence, the 21st tool plan, and Python availability for UI UX Pro Max. Missing Python is a degraded capability, never an automatic system installation.

OpenAI Product Design, Browser, Playwright, project-owned shadcn CLI, and optional MCP integrations remain external capabilities. They may improve evidence when available but are not installed or configured by ai-config.
