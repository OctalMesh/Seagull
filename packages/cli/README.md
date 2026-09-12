<!--suppress HtmlDeprecatedAttribute, HtmlUnknownTarget -->
<h1 id="title" align="center">@octalmesh/seagull-cli</h1>

<div align="center">
  <a rel="noopener noreferrer" href="https://www.npmjs.com/package/@octalmesh/seagull-cli">
    <img alt="npm version" src="https://img.shields.io/npm/v/@octalmesh/seagull-cli?style=for-the-badge&color=fff&labelColor=363636" />
  </a>
</div>

<div align="center">
  <h6>
    <a rel="noopener noreferrer" href="../../README.md">Main Readme</a>
    ·
    <a rel="noopener noreferrer" href="../core/README.md">seagull-core</a>
    ·
    <a rel="noopener noreferrer" href="../docs/README.md">seagull-docs</a>
  </h6>
</div>

Every pipeline command (`lint`, `bundle`, `generate`, `docs generate`,
`docs serve`, `publish sdk`, `publish registries`, `clean`) plus the
`commander` program that wires them into the `seagull` CLI (`createProgram()`).

Published independently for anyone who wants to script against these commands
directly without the docs bundle. Most people should install
[`@octalmesh/seagull`](../..) instead - that package owns the actual `seagull`
executable (reads its own `package.json` for `--version`/`--help` text, then
calls `createProgram()` from here to build the rest).

<div align="center">
  <h2 id="what-lives-here">What lives here</h2>
</div>

- **`commands/`** - one function per pipeline step, each taking a
  `ResolvedConfig` (from [`@octalmesh/seagull-core`](../core)) and returning
  `Promise<void>`. Every one of these is exported and directly callable -
  the CLI commands are thin `commander` wrappers around them, nothing more.

  - `commands/generate-docs.ts` and `commands/serve-docs.ts` are thin
    delegations to [`@octalmesh/seagull-docs`](../docs) - the actual docs-site
    implementation lives there, kept behind that package's own stable boundary.

- **`program.ts`** - `createProgram(metadata)`, a pure factory building the
  `commander` `Command` tree. No side effects, no `process.argv` parsing -
  the actual entrypoint (`@octalmesh/seagull`'s `src/cli.ts`) owns that, so
  this package stays testable and embeddable on its own.

<div align="center">
  <h2 id="using-a-command-directly">Using a command directly</h2>
</div>

```ts
import { loadConfig } from "@octalmesh/seagull-core";
import { bundleCommand, generateSdkCommand } from "@octalmesh/seagull-cli";

const config = loadConfig("./seagull.yaml");

await bundleCommand(config);
await generateSdkCommand(config);
```

See [`examples/sdk`](../../examples/sdk) in the repo root for a complete
walkthrough (importing from the `@octalmesh/seagull` meta-package instead, which
most scripts should prefer).

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
    This project is licensed under the <a rel="noopener noreferrer" href="../../LICENSE.md">MIT License</a>
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
