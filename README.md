# AI Config

`ai-config` is a provider-neutral configuration manager for AI coding-agent environments. Its goal
is to make a development machine reproducibly match a reviewed AI-agent setup without manually
copying standards, skills, provider configuration, and related tooling.

The project is pre-release. Phase 1 establishes the repository, package, CLI, and verification
foundation only; it does not yet configure an environment or provide production setup commands.

The intended future experience is a single package executable through `npx` or `bunx`, sharing one
application implementation. OpenAI Codex is the first-class initial provider and Claude Code is a
required supported provider; the canonical configuration remains provider-neutral.

Architecture documentation, including the approved master baseline, is in
[docs/architecture](docs/architecture/README.md). Approved delivery plans are in `docs/plans`.

## Current CLI

The development CLI currently supports only:

```bash
ai-config --help
ai-config --version
```

No configuration commands are implemented yet.
