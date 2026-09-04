import { runSync } from "@core/process/exec";
import { resolveBinPath } from "@core/process/resolve-bin";
import { syncRedoclyConfig } from "@core/redocly/redocly-sync";

import type { ResolvedConfig } from "@config/types";

/**
 * Lints every contract's OpenAPI spec.
 * Sets `process.exitCode = 1` if any contract fails.
 *
 * @param config - The resolved CLI config.
 */
export async function lintCommand(config: ResolvedConfig): Promise<void> {
  // redocly reads 'redocly.yaml' directly, so it needs to be in sync with the
  // CLI config before linting
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
