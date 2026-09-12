---
"@octalmesh/seagull": minor
"@octalmesh/seagull-core": minor
"@octalmesh/seagull-cli": minor
"@octalmesh/seagull-docs": minor
---

`paths.specFormat` lets bundled specs be written as `yaml` as well as (or
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
