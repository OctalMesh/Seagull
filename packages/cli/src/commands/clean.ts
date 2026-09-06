import { rm } from "node:fs/promises";

import type { ResolvedConfig } from "@octalmesh/seagull-core";

/**
 * Removes the entire `dist` output directory.
 *
 * @param config - The resolved seagull config.
 */
export async function cleanCommand(config: ResolvedConfig): Promise<void> {
  await rm(config.paths.dist, { recursive: true, force: true });

  console.log(`Cleaned ${config.paths.dist}`);
}
