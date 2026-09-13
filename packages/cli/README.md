<!--suppress HtmlDeprecatedAttribute, HtmlUnknownTarget -->
<h1 id="title" align="center">@octalmesh/seagull-cli</h1>

<div align="center">
  <!-- Version Badge -->
  <a rel="noopener noreferrer" href="https://npmjs.com/package/@octalmesh/seagull-cli">
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://img.shields.io/npm/v/@octalmesh/seagull-cli?style=for-the-badge&label=Version&color=363636&labelColor=464646&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEgNy44di01UTEuMiAxLjIgMi44IDFoNXEuNyAwIDEuMi41bDYuMyA2LjNhMiAyIDAgMCAxIDAgMi40bC01IDVhMiAyIDAgMCAxLTIuNSAwTDEuNSA5QTIgMiAwIDAgMSAxIDcuOG0xLjUgMFY4bDYuMyA2LjJoLjRsNS01di0uNEw4IDIuNmwtLjItLjFoLTVsLS4zLjNaTTYgNWExIDEgMCAxIDEgMCAyIDEgMSAwIDAgMSAwLTIiLz48L3N2Zz4=" />
      <img alt="Version" src="https://img.shields.io/npm/v/@octalmesh/seagull-cli?style=for-the-badge&label=Version&color=fff&labelColor=eaeaea&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHBhdGggZmlsbD0iIzM2MzYzNiIgZD0iTTEgNy44di01UTEuMiAxLjIgMi44IDFoNXEuNyAwIDEuMi41bDYuMyA2LjNhMiAyIDAgMCAxIDAgMi40bC01IDVhMiAyIDAgMCAxLTIuNSAwTDEuNSA5QTIgMiAwIDAgMSAxIDcuOG0xLjUgMFY4bDYuMyA2LjJoLjRsNS01di0uNEw4IDIuNmwtLjItLjFoLTVsLS4zLjNaTTYgNWExIDEgMCAxIDEgMCAyIDEgMSAwIDAgMSAwLTIiLz48L3N2Zz4=" />
    </picture>
  </a>
  <!-- NPM Downloads Badge -->
  <a rel="noopener noreferrer" href="https://www.npmjs.com/package/@octalmesh/seagull-cli">
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://img.shields.io/npm/dm/@octalmesh/seagull-cli?style=for-the-badge&logo=npm&color=363636&labelColor=464646" />
      <img alt="NPM Downloads" src="https://img.shields.io/npm/dm/@octalmesh/seagull-cli?style=for-the-badge&logo=npm&logoColor=464646&color=fff&labelColor=eaeaea" />
    </picture>
  </a>
  <!-- License Badge -->
  <a rel="noopener noreferrer" href="LICENSE.md">
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://img.shields.io/github/license/OctalMesh/Seagull?style=for-the-badge&color=363636&labelColor=464646&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTguOC44VjJoMXEuMyAwIC44LjJsMS4zLjhoMi40YS44LjggMCAwIDEgMCAxLjVoLS41TDE2IDkuMmExIDEgMCAwIDEtLjEuOGwtLjUtLjUuNS41di4xbC0uOC40cS0uNi41LTIgLjVhNSA1IDAgMCAxLTItLjVsLS43LS40YTEgMSAwIDAgMS0uMi0xbDItNC42cS0uNiAwLTEtLjJMMTAgMy41SDguN1YxM2gyLjZhLjguOCAwIDAgMSAwIDEuNUg0LjhhLjguOCAwIDAgMSAwLTEuNWgyLjVWMy41SDZMNSA0LjNsLTEgLjIgMiA0LjdhMSAxIDAgMCAxLS4xLjhsLS41LS41LjUuNXYuMWwtLjguNHEtLjYuNS0yIC41YTUgNSAwIDAgMS0yLS41bC0uNy0uNEExIDEgMCAwIDEgMCA5bDItNC42aC0uNGEuOC44IDAgMCAxIDAtMS41aDIuNGwxLjMtLjguOS0uMmgxVi44YS44LjggMCAwIDEgMS41IDBtMi45IDguNHEuNC4zIDEuMy4zYy45IDAgMS0uMSAxLjMtLjNMMTMgNi4zWm0tMTAgMHEuNC4zIDEuMy4zYy45IDAgMS0uMSAxLjMtLjNMMyA2LjNaIi8+PC9zdmc+" />
      <img alt="License" src="https://img.shields.io/github/license/OctalMesh/Seagull?style=for-the-badge&color=fff&labelColor=eaeaea&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHBhdGggZmlsbD0iIzM2MzYzNiIgZD0iTTguOC44VjJoMXEuMyAwIC44LjJsMS4zLjhoMi40YS44LjggMCAwIDEgMCAxLjVoLS41TDE2IDkuMmExIDEgMCAwIDEtLjEuOGwtLjUtLjUuNS41di4xbC0uOC40cS0uNi41LTIgLjVhNSA1IDAgMCAxLTItLjVsLS43LS40YTEgMSAwIDAgMS0uMi0xbDItNC42cS0uNiAwLTEtLjJMMTAgMy41SDguN1YxM2gyLjZhLjguOCAwIDAgMSAwIDEuNUg0LjhhLjguOCAwIDAgMSAwLTEuNWgyLjVWMy41SDZMNSA0LjNsLTEgLjIgMiA0LjdhMSAxIDAgMCAxLS4xLjhsLS41LS41LjUuNXYuMWwtLjguNHEtLjYuNS0yIC41YTUgNSAwIDAgMS0yLS41bC0uNy0uNEExIDEgMCAwIDEgMCA5bDItNC42aC0uNGEuOC44IDAgMCAxIDAtMS41aDIuNGwxLjMtLjguOS0uMmgxVi44YS44LjggMCAwIDEgMS41IDBtMi45IDguNHEuNC4zIDEuMy4zYy45IDAgMS0uMSAxLjMtLjNMMTMgNi4zWm0tMTAgMHEuNC4zIDEuMy4zYy45IDAgMS0uMSAxLjMtLjNMMyA2LjNaIi8+PC9zdmc+" />
    </picture>
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
