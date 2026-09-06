import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import {
  type ResolvedConfig,
  resolveBinPath,
  run,
  syncRedoclyConfig,
} from "@octalmesh/seagull-core";

/**
 * Bundles every contract's OpenAPI spec into `dist/specs/<contract>.json`.
 *
 * @param config - The resolved seagull config.
 */
export async function bundleCommand(config: ResolvedConfig): Promise<void> {
  await syncRedoclyConfig(config);

  await rm(config.paths.specs, { recursive: true, force: true });
  await mkdir(config.paths.specs, { recursive: true });

  const redoclyBin = resolveBinPath("@redocly/cli", "redocly");

  for (const contract of config.contracts) {
    const output = path.join(config.paths.specs, `${contract.name}.json`);

    await run(
      "node",
      [redoclyBin, "bundle", contract.entrypoint, "-o", output],
      config.rootDir,
    );
  }

  console.log(
    `Bundled ${config.contracts.length} specifications into ${config.paths.specs}`,
  );
}
