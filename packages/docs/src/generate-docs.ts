import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { ResolvedConfig } from "@octalmesh/seagull-core";

/**
 * Generates the documentation website for every contract into `dist/docs`.
 *
 * @param config - The resolved seagull config.
 */
export async function generateDocsSite(config: ResolvedConfig): Promise<void> {
  const output = config.paths.docs;
  const specsOutput = join(output, "specs");

  await rm(output, { recursive: true, force: true });
  await mkdir(specsOutput, { recursive: true });

  for (const contract of config.contracts) {
    const source = join(config.paths.specs, `${contract.name}.json`);
    const target = join(specsOutput, `${contract.name}.json`);
    const contents = await readFile(source, "utf8");

    await writeFile(target, contents);
  }

  const require = createRequire(import.meta.url);
  const mainEntryPoint = require.resolve("@scalar/api-reference");

  let packageDir = dirname(mainEntryPoint);

  while (
    !packageDir.endsWith("@scalar/api-reference") &&
    !packageDir.endsWith("@scalar\\api-reference")
  ) {
    const parent = dirname(packageDir);

    if (parent === packageDir) {
      break;
    }

    packageDir = parent;
  }

  const scalarScriptPath = join(packageDir, "dist", "browser", "standalone.js");
  const scalarTarget = join(output, "scalar.js");

  await copyFile(scalarScriptPath, scalarTarget);
  console.log(`Copied Scalar script to ${scalarTarget}`);

  const sources = config.contracts
    .map(
      (contract, index) => `{
      title: ${JSON.stringify(contract.title)},
      slug: ${JSON.stringify(contract.name)},
      url: "./specs/${contract.name}.json"${
        index === 0 ? ",\n      default: true" : ""
      }
    }`,
    )
    .join(",\n");

  const { metadata } = config.docs;
  const html =
    //<editor-fold desc="HTML Template" defaultstate="collapsed">
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>

    <!-- Load the Script -->
    <script src="./scalar.js"></script>

    <!-- Initialize the API Reference -->
    <script>
      Scalar.createApiReference("#app", {
        baseServerURL: "${metadata.baseServerUrl}",
        favicon: "${metadata.favicon}",
        metaData: {
          title: "${metadata.title}",
          description: "${metadata.description}",
          ogTitle: "${metadata.title}",
          ogDescription: "${metadata.description}",
        },
        layout: "classic",
        darkMode: true,
        telemetry: false,
        showDeveloperTools: "never",
        showOperationId: true,
        hideTestRequestButton: false,
        sources: [
          ${sources}
        ]
      });
    </script>
  </body>
</html>
`;
  //</editor-fold>

  await writeFile(join(output, "index.html"), html);

  console.log(`Generated documentation website at ${output}`);
}
