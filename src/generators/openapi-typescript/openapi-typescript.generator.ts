import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Generator } from "@core/generator/generator";
import type { GenerateContext, PrepareContext } from "@core/generator/types";
import { run } from "@core/process/exec";
import { resolveBinPath } from "@core/process/resolve-bin";

import type { SdkTool } from "@config/types";

/**
 * Wraps `openapi-typescript`. Unlike `openapi-generator-cli`, it isn't invoked
 * once per artifact - it reads `redocly.yaml`'s `apis:` map (kept in sync with
 * the CLI config by `core/redocly/redocly-sync.ts`) and writes every contract's
 * `index.d.ts` to its configured `x-openapi-ts.output` path in a single run,
 * so that single global invocation happens once in {@link prepare}.
 * {@link generate} then only has to write each artifact's package.json` -
 * `openapi-typescript` emits `index.d.ts` alone, with no package manifest of
 * its own to patch.
 */
export class OpenApiTypescriptGenerator extends Generator {
  readonly tool: SdkTool = "openapi-typescript";

  override async prepare({ rootDir, entries }: PrepareContext): Promise<void> {
    await Promise.all(
      entries.map((entry) =>
        mkdir(entry.artifact.outputDir, { recursive: true }),
      ),
    );

    const bin = resolveBinPath("openapi-typescript", "openapi-typescript");

    await run("node", [bin], rootDir);
  }

  async generate({
    contract,
    artifact,
    version,
    github,
  }: GenerateContext): Promise<void> {
    const pkg = {
      name: artifact.package,
      version,
      description: `Types-only OpenAPI contract for the ${contract.name} service.`,
      types: "./index.d.ts",
      files: ["index.d.ts"],
      license: "MIT",
      repository: {
        type: "git",
        url: `git+https://github.com/${github.owner}/${github.repo}.git`,
        directory: `sdk/svc-${contract.name}/${artifact.id}`,
      },
      publishConfig: {
        registry: "https://npm.pkg.github.com",
        access: "restricted",
      },
    };

    await writeFile(
      path.join(artifact.outputDir, "package.json"),
      JSON.stringify(pkg, null, 2),
    );
  }
}
