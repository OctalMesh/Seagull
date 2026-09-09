# @octalmesh/seagull-core

**Internal package** - not published to npm on its own. This is the config
loading + SDK generator engine, bundled straight into
[`@octalmesh/seagull`](../..) at build time (see the root `tsdown.config.ts`).
It's organized as its own package for a clean internal boundary, not as a
separately installable one.

See the [main README](https://github.com/OctalMesh/Seagull#readme) for the
full config reference (`generators:`, `contracts:`, `publishing:`, custom
README templates, ...) and the [`@octalmesh/seagull`](../..) package for the
actual public API surface (this package's exports, re-exported).

## What lives here

- `config/` - the `seagull.yaml` schema (zod), loader, `{...}` template
  engine, and publishing-conventions resolution.
- `generator/` - the `Generator` abstract primitive and `GeneratorRegistry`
  every concrete generator plugs into.
- `generators/` - the built-in `openapi-generator-cli` and `openapi-typescript`
  generator implementations.
- `readme/` - README rendering for generated SDK artifacts (custom template
  or built-in default, per language/kind).
- `redocly/` - keeps `redocly.yaml` in sync with `seagull.yaml`.
- `git/`, `process/`, `version/` - small process/git/versioning utilities
  used by the pipeline commands (which live in
  [`@octalmesh/seagull-cli`](../cli)).

## Extending seagull with a custom generator

`Generator` is the root primitive every SDK generator implements -
`GeneratorRegistry` looks one up by the `tool` name referenced in
`generators.*.tool` in the config:

```ts
import { Generator, GeneratorRegistry } from "@octalmesh/seagull-core";
import type { GenerateContext } from "@octalmesh/seagull-core";

class MyGenerator extends Generator {
  readonly tool = "my-tool";

  async generate(ctx: GenerateContext): Promise<void> {
    // ...
  }
}

const registry = new GeneratorRegistry().register(new MyGenerator());
```

## License

MIT
