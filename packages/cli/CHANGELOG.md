# @octalmesh/seagull-cli

## 0.1.1

### Patch Changes

- ec5c83b: Add LICENSE file to individual npm packages.
- 71ab054: Expand supported Node.js and pnpm version ranges in `engines` to improve
  compatibility.
- Updated dependencies [ec5c83b]
- Updated dependencies [71ab054]
  - @octalmesh/seagull-core@0.1.1
  - @octalmesh/seagull-docs@0.1.1

## 0.1.0

### Minor Changes

- 3e1d383: Restructured into a monorepo of internal, private packages
  (`@octalmesh/seagull-core`, `@octalmesh/seagull-cli`, `@octalmesh/seagull-docs`)
  bundled into the single published `@octalmesh/seagull` package - nothing
  changes for consumers of the CLI itself.
  
  - `seagull.yaml` now requires a top-level `configVersion: 1` field, decoupled
    from the npm package's own version - it only changes when the config
    schema itself changes in a breaking way. **Action required:** add
    `configVersion: 1` to existing configs.
- 3e1d383: `paths.specFormat` lets bundled specs be written as `yaml` as well as (or
  instead of) `json` - Redocly's `bundle` already infers its output format
  from the file extension on its own, seagull just wasn't giving it the
  choice. Accepts a single value (`specFormat: yaml`) or a list
  (`specFormat: [json, yaml]`) to bundle into more than one format at once;
  defaults to `json`, unchanged from before. When more than one format is
  configured, the first one listed is the "primary" format SDK generation,
  version/hash resolution, and the docs site actually read from - the rest
  are bundled as additional static artifacts alongside it.
  
  `seagull.yaml` (and `redocly.base.yaml`) now also support the YAML `<<:
  *anchor` merge key, the same pattern used in Docker Compose files, so a
  config can define a `defaults: &defaults {...}` block once and reuse it
  across e.g. multiple `generators:` entries instead of repeating the same
  fields everywhere.

### Patch Changes

- Updated dependencies [3e1d383]
- Updated dependencies [3e1d383]
  - @octalmesh/seagull-core@0.1.0
  - @octalmesh/seagull-docs@0.1.0
