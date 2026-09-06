# Test fixtures

This directory is reserved for safe, repository-owned test inputs. Fixtures must never contain
credentials, personal paths, private repository data, or provider tokens.

Phase 1's CLI integration test requires no configuration fixture because it proves that the CLI
does not create configuration when run with an isolated temporary home directory.
