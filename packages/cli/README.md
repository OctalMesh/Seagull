# @octalmesh/seagull-cli

**Internal package** - not published to npm on its own. This holds every
pipeline command (`lint`, `bundle`, `generate`, `docs generate`, `docs serve`,
`publish sdk`, `publish registries`, `clean`) and the `commander` program
that wires them up (`createProgram()`), bundled straight into
[`@octalmesh/seagull`](../..) at build time - that package owns the actual
`seagull` executable and reads its own `package.json` for `--version`/
`--help` text, then calls `createProgram()` from here to build the rest.

See the [main README](https://github.com/OctalMesh/Seagull#readme) for the
command reference and full config docs.

## What lives here

- `commands/` - one function per pipeline step, each taking a
  `ResolvedConfig` (from [`@octalmesh/seagull-core`](../core)) and returning
  `Promise<void>`.
- `program.ts` - `createProgram(metadata)`, a pure factory building the
  `commander` `Command` tree. No side effects, no `process.argv` parsing -
  the actual entrypoint (`@octalmesh/seagull`'s `src/cli.ts`) owns that.

`commands/generate-docs.ts` and `commands/serve-docs.ts` are thin
delegations to [`@octalmesh/seagull-docs`](../docs) - the actual docs-site
implementation lives there.

## License

MIT
