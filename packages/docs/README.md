# @octalmesh/seagull-docs

**Internal package** - not published to npm on its own, bundled into
[`@octalmesh/seagull`](../..) at build time.

Generates the documentation site `seagull docs generate`/`docs serve` produce.
Currently a thin wrapper around [Scalar](https://github.com/scalar/scalar)'s
standalone bundle - this package exists as its own boundary specifically so
the docs implementation can be replaced with a fully custom UI later without
touching `seagull-cli` or `seagull-core` at all. The CLI only ever calls
`generateDocsSite(config)` / `serveDocsSite(config)`; that's the contract
that has to keep working, everything behind it is free to change.

## Status

Placeholder. The current output (Scalar, unstyled beyond its own defaults)
is a starting point, not the intended long-term docs experience.

## License

MIT
