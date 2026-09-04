import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { GeneratorRegistry } from "@core/generator/registry";
import { renderReadme } from "@core/readme/readme-renderer";
import { syncRedoclyConfig } from "@core/redocly/redocly-sync";
import {
  type BundledSpec,
  hashSpec,
  resolveVersion,
} from "@core/version/version";

import type { ResolvedConfig } from "@config/types";

import { OpenApiGeneratorCli } from "@generators/openapi-generator-cli";
import { OpenApiTypescriptGenerator } from "@generators/openapi-typescript";

interface VersionInfo {
  version: string;
  hash: string;
}

/**
 * Generates SDK packages for every artifact of every contract in the config.
 *
 * @param config - The resolved config.
 */
export async function generateSdkCommand(
  config: ResolvedConfig,
): Promise<void> {
  // openapi-typescript reads 'redocly.yaml' directly, so it needs to be in sync
  // with the CLI config before that generator's 'prepare()' runs
  await syncRedoclyConfig(config);

  const registry = new GeneratorRegistry()
    .register(new OpenApiGeneratorCli())
    .register(new OpenApiTypescriptGenerator());

  await rm(config.paths.sdk, { recursive: true, force: true });
  await mkdir(config.paths.sdk, { recursive: true });

  for (const tool of registry.tools()) {
    const entries = config.allArtifacts.filter(
      (entry) => entry.artifact.tool === tool,
    );

    await registry
      .resolve(tool)
      .prepare?.({ rootDir: config.rootDir, entries });
  }

  const versionCache = new Map<string, VersionInfo>();

  async function getVersionInfo(contractName: string): Promise<VersionInfo> {
    const cached = versionCache.get(contractName);

    if (cached) {
      return cached;
    }

    const specPath = path.join(config.paths.specs, `${contractName}.json`);
    const raw = await readFile(specPath, "utf8");
    const spec = JSON.parse(raw) as BundledSpec;

    const info: VersionInfo = {
      version: resolveVersion(spec, contractName),
      hash: hashSpec(raw),
    };

    versionCache.set(contractName, info);

    return info;
  }

  for (const { contract, artifact } of config.allArtifacts) {
    const { version, hash } = await getVersionInfo(contract.name);
    const generator = registry.resolve(artifact.tool);

    await generator.generate({
      rootDir: config.rootDir,
      contract,
      artifact,
      version,
      github: config.github,
      specInputPath: path.join(config.paths.specs, `${contract.name}.json`),
    });

    await writeFile(path.join(artifact.outputDir, "VERSION"), `${version}\n`);
    await writeFile(path.join(artifact.outputDir, "SPEC_HASH"), `${hash}\n`);
    await writeFile(
      path.join(artifact.outputDir, "README.md"),
      await renderReadme({
        contract,
        artifact,
        version,
        github: config.github,
        vars: config.vars,
      }),
    );
  }

  const versionSummary = [...versionCache.entries()]
    .map(([name, { version }]) => `${name}@${version}`)
    .join(", ");

  console.log(
    `Generated ${config.allArtifacts.length} SDK packages into ${config.paths.sdk} (${versionSummary})`,
  );
}
