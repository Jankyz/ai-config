# Third-party notices

## 21st

The following local skills are adapted from [21st-dev/skill](https://github.com/21st-dev/skill) at commit
`0d77001a77fe8540bb07ed68d09092ee08546ed3`:

- `skills/aic-ui-components` from upstream `skills/21st-cli-use`
- `skills/aic-ui-generate` from upstream `skills/21st-ai`

The exact upstream Apache-2.0 license bytes are distributed at `third_party/21st/LICENSE` (SHA-256
`ac17c29e5529b0d977b8521353838c06c46f814d83de12da221418d62102de6f`). No upstream `NOTICE` file exists at this pinned
commit. These are adapted resources: the local ai-config instructions are authoritative, while the pinned upstream
revision and resource digests in `upstream/lock.json` provide provenance for future review.

## Matt Pocock Skills

Selected resources are sourced from [mattpocock/skills](https://github.com/mattpocock/skills) at commit
`3cca18b368ae95cdbdebbff572ccafa662551015`, under MIT. The exact license is distributed at
`third_party/matt/LICENSE` (SHA-256 `0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5`).

- `aic-tdd` and `aic-domain-modeling` are adapted resources.
- `codebase-design` and `writing-for-agents` are external-managed resources acquired unchanged from their locked upstream revision during setup/update.

## UI UX Pro Max

`ui-ux-pro-max` is sourced from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
at commit `4aad0584d92131626b16d4ff4d77f0455385013c`, under MIT. The exact license is distributed at
`third_party/ui-ux-pro-max/LICENSE` (SHA-256 `738f69dfa83db5c347c678fb9d90e560877059f0de93a327c39001bff92dc014`).
Its data and scripts remain unchanged; ai-config renders only provider-specific skill entry points from the locked templates.

## shadcn

`aic-shadcn` is adapted from [shadcn-ui/ui](https://github.com/shadcn-ui/ui) at commit
`3ba91b1cc83e1bbe4ab35a422ff2a694849c5048`, under MIT. The exact license is distributed at
`third_party/shadcn/LICENSE` (SHA-256 `1564074e13439397221ffd522e2e504d56561994a23d371aa5e3ad43e4f5423f`).

## 21st CLI

The managed `@21st-dev/cli` package is pinned to `1.17.0` under MIT with its npm SRI recorded in `upstream/lock.json`.
Setup/update acquires the exact registry-declared HTTPS tarball, verifies the locked SRI before extraction, and never runs
package lifecycle scripts. The npm runtime package is not distributed inside ai-config.
