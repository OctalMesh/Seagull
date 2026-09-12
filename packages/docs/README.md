<!--suppress HtmlDeprecatedAttribute, HtmlUnknownTarget -->
<h1 id="title" align="center">@octalmesh/seagull-docs</h1>

<div align="center">
  <a rel="noopener noreferrer" href="https://www.npmjs.com/package/@octalmesh/seagull-docs">
    <img alt="npm version" src="https://img.shields.io/npm/v/@octalmesh/seagull-docs?style=for-the-badge&color=fff&labelColor=363636" />
  </a>
</div>

<div align="center">
  <h6>
    <a rel="noopener noreferrer" href="../../README.md">Main Readme</a>
    ·
    <a rel="noopener noreferrer" href="../core/README.md">seagull-core</a>
    ·
    <a rel="noopener noreferrer" href="../cli/README.md">seagull-cli</a>
  </h6>
</div>

Generates the documentation website from a bundled spec and serves it.
Published independently for anyone who wants only this piece. Most people should
install [`@octalmesh/seagull`](../..) instead, which bundles this package
(and `-core`/`-cli`) into one.

<div align="center">
  <h2 id="api">API</h2>
</div>

```ts
import { loadConfig } from "@octalmesh/seagull-core";
import { generateDocsSite, serveDocsSite } from "@octalmesh/seagull-docs";

const config = loadConfig("./seagull.yaml");

await generateDocsSite(config);             // writes dist/docs
const server = await serveDocsSite(config); // serves it, returns the Node http.Server for a programmatic shutdown
```

Every contract's bundled spec (`paths.specFormat` - `json`, `yaml`, or both)
is copied into `dist/docs/specs/`.

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
