/**
 * Programmatic API walkthrough
 *
 * Everything `seagull`'s CLI does, `@octalmesh/seagull` also exposes as plain
 * functions - useful for scripting the pipeline yourself (e.g. a custom release
 * tool, a CI step that only needs one stage, or generating SDKs as part of a
 * larger build).
 *
 * `@octalmesh/seagull`'s own entrypoint flatly re-exports everything from its
 * internal packages, so it behaves like any other npm package - one import, no
 * namespacing. If you only need one piece (and the smaller dependency footprint
 * that comes with it), `@octalmesh/seagull-core` / `-cli` / `-docs` are
 * published independently too.
 *
 * Run this against any config, e.g. the multiservice example next to this
 * file's parent directory:
 * ```
 *   npx tsx examples/sdk/generate-programmatically.ts \
 *     examples/configuration/multiservice/seagull.yaml
 * ```
 */
import {
  type ResolvedConfig,
  bundleCommand,
  generateDocsSite,
  generateSdkCommand,
  loadConfig,
} from "@octalmesh/seagull";

async function main(): Promise<void> {
  const configPath = process.argv[2];

  if (!configPath) {
    console.error("Usage: generate-programmatically.ts <path-to-seagull.yaml>");
    process.exitCode = 1;

    return;
  }

  // loadConfig does everything `seagull lint`'s config step does: reads the
  // YAML, validates it against the zod schema, resolves every generator +
  // contract + artifact's naming/publishing templates, and throws a readable,
  // path-annotated error on the first problem it finds.
  const config: ResolvedConfig = loadConfig(configPath);

  console.log(
    `Loaded config for ${config.contracts.length} contract(s), ` +
      `bundling into: ${config.paths.specFormat.join(", ")}`,
  );

  // Each pipeline stage is just an async function taking the resolved config,
  // run only the ones you need, in whatever order/composition your own tooling
  // wants. The CLI (`seagull generate`, etc.) is a thin wrapper calling these
  // same functions.
  await bundleCommand(config);
  await generateSdkCommand(config);
  await generateDocsSite(config);

  // Every generated artifact's resolved metadata (package name, branch, tag,
  // output directory, ...) is available without reparsing anything. It's useful
  // for e.g. printing a release summary, or feeding into your own publishing
  // logic instead of `publishSdkCommand`.
  for (const { contract, artifact } of config.allArtifacts) {
    console.log(`${contract.name}/${artifact.id} -> ${artifact.outputDir}`);
  }
}

await main();
