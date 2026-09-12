---
"@octalmesh/seagull": minor
---

Restructured into a monorepo of internal, private packages
(`@octalmesh/seagull-core`, `@octalmesh/seagull-cli`, `@octalmesh/seagull-docs`)
bundled into the single published `@octalmesh/seagull` package - nothing
changes for consumers of the CLI itself.

- `seagull.yaml` now requires a top-level `configVersion: 1` field, decoupled
  from the npm package's own version - it only changes when the config
  schema itself changes in a breaking way. **Action required:** add
  `configVersion: 1` to existing configs.
