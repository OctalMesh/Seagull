<!--suppress HtmlDeprecatedAttribute, HtmlUnknownTarget -->
<h1 id="title" align="center">Examples</h1>

<div align="center">
  <h6>
    <a rel="noopener noreferrer" href="../README.md">Readme</a>
    ·
    <a rel="noopener noreferrer" href="../CONTRIBUTING.md">Contributing</a>
    ·
    <a rel="noopener noreferrer" href="../RELEASING.md">Releasing</a>
  </h6>
</div>

Runnable, verified references for every seagull feature - the config examples
below all load and resolve successfully against the real `@octalmesh/seagull-core`
schema (see each folder for what to check for yourself).

```
examples/
├── configuration/
│   ├── minimal/                      The smallest valid configuration
│   │   └── seagull.yaml
│   └── multiservice/                 Every config feature in one file
│       ├── seagull.yaml
│       └── readme-templates/
│           └── ts-server.md          Custom generated-README template
└── sdk/
    └── generate-programmatically.ts  Scripting the pipeline directly
```

<div align="center">
  <h2 id="configuration">Configuration</h2>
</div>

| Example                                                    | What it demonstrates                                                                                               |
|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| [`configuration/minimal`](configuration/minimal)           | The smallest config that passes validation - one contract, one generator, every optional field left at its default |
| [`configuration/multiservice`](configuration/multiservice) | Everything else - see the table below                                                                              |

`configuration/multiservice/seagull.yaml` is the one to read end-to-end once you
know the basics - it's a single file covering:

| Feature                                         | Where                                                                                                                        |
|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| Multiple contracts, multiple generators         | `contracts:` / `generators:`                                                                                                 |
| `vars:` and naming-template placeholders        | `vars.org`, `{vars.org}` used throughout                                                                                     |
| Bundling into more than one spec format at once | `paths.specFormat: [json, yaml]`                                                                                             |
| YAML `<<: *anchor` merge keys                   | `_ts_defaults: &ts_defaults` reused across `ts-server`/`ts-client`                                                           |
| A custom generated-README template              | `generators.ts-server.readme` -> [`readme-templates/ts-server.md`](configuration/multiservice/readme-templates/ts-server.md) |
| Per-generator `publishing:` override            | `generators.ts-client.publishing.npm.registry`                                                                               |
| Per-contract-artifact `overrides:` + `as`       | `contracts[payment].artifacts[1]` (renamed to `java-client-legacy`)                                                          |
| Maven-published artifacts                       | `generators.java-client.maven`                                                                                               |

Both configs load and fully resolve with `loadConfig()` as-is - no editing
needed to inspect the resolved shape:

```bash
node -e '
import("@octalmesh/seagull-core").then(({ loadConfig }) => {
  console.log(loadConfig("examples/configuration/multiservice/seagull.yaml"));
});
'
```

> [!NOTE]
> These two files demonstrate every *config* feature and are verified to load
> and resolve correctly - they're not complete runnable projects on their own
> To actually run `seagull lint`/`bundle`/`generate` against one, drop it into
> a real contracts repo next to your specs, or see
> [`e2e/fixtures/contracts-fixture`](../e2e/fixtures/contracts-fixture) in this
> repo for a complete, runnable one used by the test suite itself.

<div align="center">
  <h2 id="sdk-programmatic-api">SDK / Programmatic API</h2>
</div>

[`sdk/generate-programmatically.ts`](sdk/generate-programmatically.ts) walks
through scripting the pipeline directly instead of going through the CLI -
`loadConfig`, then calling `bundleCommand`/`generateSdkCommand`/
`generateDocsSite` yourself, and reading back each artifact's resolved metadata.

```bash
node --experimental-strip-types \
  examples/sdk/generate-programmatically.ts \
  examples/configuration/multiservice/seagull.yaml
```

<div align="center">
  <!--
  =====================
         FOOTER
  =====================
  -->
  <h1></h1>
  <br />
  <!-- OctalMesh Logo -->
  <a rel="noopener noreferrer" target="_blank" href="https://octalmesh.com">
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/logo/svg/octal_mesh_center.svg" />
      <img alt="OctalMesh" src="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/logo/svg/octal_mesh_center_white.svg" height="48" />
    </picture>
  </a>
  <br /><br />
  <!-- Socials -->
  <div>
    <!-- Telegram Badge -->
    <a rel="noopener noreferrer" target="_blank" href="https://octalmesh.com/telegram">
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/telegram.svg" />
        <img alt="Telegram" src="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/telegram_white.svg" width="48" />
      </picture>
    </a>
    &nbsp;
    <!-- YouTube Badge -->
    <a rel="noopener noreferrer" target="_blank" href="https://octalmesh.com/youtube">
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/youtube.svg" />
        <img alt="YouTube" src="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/youtube_white.svg" width="48" />
      </picture>
    </a>
    &nbsp;
    <!-- TikTok Badge -->
    <a rel="noopener noreferrer" target="_blank" href="https://octalmesh.com/tiktok">
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/tiktok.svg" />
        <img alt="TikTok" src="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/tiktok_white.svg" width="48" />
      </picture>
    </a>
    &nbsp;
    <!-- Instagram Badge -->
    <a rel="noopener noreferrer" target="_blank" href="https://octalmesh.com/instagram">
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/instagram.svg" />
        <img alt="Instagram" src="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/instagram_white.svg" width="48" />
      </picture>
    </a>
    &nbsp;
    <!-- X Badge -->
    <a rel="noopener noreferrer" target="_blank" href="https://octalmesh.com/x">
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/x.svg" />
        <img alt="X" src="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/x_white.svg" width="48" />
      </picture>
    </a>
    &nbsp;
    <!-- Reddit Badge -->
    <a rel="noopener noreferrer" target="_blank" href="https://octalmesh.com/reddit">
      <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/reddit.svg" />
        <img alt="Reddit" src="https://raw.githubusercontent.com/OctalMesh/OctalDesign/release/assets/icon/svg/reddit_white.svg" width="48" />
      </picture>
    </a>
  </div>
</div>
<h6>
  <div align="center">
    • • •
    <br /><br />
    This project is licensed under the <a rel="noopener noreferrer" href="../LICENSE.md">MIT License</a>
    <br /><br />
  </div>
  <div align="justify">
    <ul>
      <li>Feel free to use this project for any purpose, including commercial applications.</li>
      <li>You are permitted to modify, distribute, and include this project in any form, as long as the original copyright notice is retained.</li>
      <li>If you share or publish modified versions, attribution to the original <a rel="noopener noreferrer" href="https://github.com/OctalMesh/Seagull">GitHub repository</a> is appreciated.</li>
      <li>This software is provided "as is", without any warranties or guarantees, as detailed in the license terms.</li>
    </ul>
  </div>
</h6>
