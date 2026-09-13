# @octalmesh/seagull

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

- e65b353: CI only: added the full release pipeline for the `dev` / `release` branch model.
  
  - `quality.yaml` / `test.yaml` / `codeql.yaml` - typecheck+lint+format,
    the full test suite, and CodeQL, each running on push to `dev`/`release`
    and on pull requests into either branch.
  - `version.yaml` - keeps a "Version Packages" PR up to date on `dev` from
    pending changesets, and once that PR merges and `dev`'s version pulls
    ahead of `release`'s, opens the `dev -> release` PR automatically.
  - `release-readiness.yaml` - blocks the `dev -> release` PR until the
    version on `dev` is actually ahead of what's on `release`.
  - `post-release.yaml` - once that PR merges, tags the release and opens a
    draft GitHub Release with the changelog pre-filled, and merges `release`
    straight back into `dev` so it never needs reconciling by hand.
  - `publish.yaml` - publishes all four packages to npm when the draft Release is
    published, via npm Trusted Publishing (OIDC) - no `NPM_TOKEN` in CI.
  - `dependabot.yaml` - weekly dependency and GitHub Actions updates against
    `dev`, grouped by ecosystem.
  
  See `RELEASING.md` for the full walkthrough.
- Updated dependencies [3e1d383]
- Updated dependencies [3e1d383]
  - @octalmesh/seagull-core@0.1.0
  - @octalmesh/seagull-cli@0.1.0
  - @octalmesh/seagull-docs@0.1.0
