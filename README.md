# AI Config

`ai-config` is a provider-neutral configuration manager for AI coding-agent environments. Its goal
is to make a development machine reproducibly match a reviewed AI-agent setup without manually
copying standards, skills, provider configuration, and related tooling.

The project is pre-release. Configuration changes are intentionally preview-first and are never
made by package installation alone.

The intended future experience is a single package executable through `npx` or `bunx`, sharing one
application implementation. OpenAI Codex is the first-class initial provider and Claude Code is a
required supported provider; the canonical configuration remains provider-neutral.

Architecture documentation, including the approved master baseline, is in
[docs/architecture](docs/architecture/README.md). Approved delivery plans are in `docs/plans`.

## CLI

Use an explicit provider for configuration-changing commands. Without `--apply`, every mutating
command is a read-only preview.

```bash
ai-config setup --provider codex
ai-config setup --provider codex --replace-conflict codex.global.instructions
ai-config setup --provider codex --replace-conflict codex.global.instructions --approve-preview <fingerprint> --apply
ai-config update --provider codex
ai-config doctor --provider codex
ai-config rollback --provider codex --transaction <uuid>
ai-config rollback --provider codex --transaction <uuid> --apply
```

`setup` establishes the approved global instructions and provider representation. Exact,
pre-existing canonical files may be adopted with `--apply`; different or unsafe targets remain a
conflict unless the owner explicitly names that exact artifact with `--replace-conflict`. The
preview prints an approval fingerprint; exceptional replacement requires that exact current
fingerprint through `--approve-preview` together with `--apply`. `update` applies the package's desired state only to an already managed/adopted
environment. `doctor` is always read-only. `rollback` always requires an explicit transaction ID.

The same commands support `--provider claude`; Phase 9 verifies Claude only in isolated roots.
Neither provider's settings, authentication, plugins, or unrelated files are managed.
