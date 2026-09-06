import {
  type ResolvedConfig,
  resolveBinPath,
  runSync,
  syncRedoclyConfig,
} from "@octalmesh/seagull-core";

/**
 * Lints every contract's OpenAPI spec.
 * Sets `process.exitCode = 1` if any contract fails.
 *
 * @param config - The resolved seagull config.
 */
export async function lintCommand(config: ResolvedConfig): Promise<void> {
  // redocly reads 'redocly.yaml' directly, so it needs to be in sync with the
  // seagull config before linting
  await syncRedoclyConfig(config);

  console.log("Linting OpenAPI contracts...");

  const redoclyBin = resolveBinPath("@redocly/cli", "redocly");
  let hasErrors = false;

  for (const contract of config.contracts) {
    console.log(`Checking [${contract.name}]...`);

    const status = runSync(
      "node",
      [redoclyBin, "lint", contract.entrypoint],
      config.rootDir,
    );

    if (status !== 0) {
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}
