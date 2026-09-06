import type { ResolvedConfig } from "@octalmesh/seagull-core";
import { generateDocsSite } from "@octalmesh/seagull-docs";

/**
 * Generates the documentation website for every contract into `dist/docs`.
 * Delegates to `@octalmesh/seagull-docs` - see that package for the actual
 * implementation.
 *
 * @param config - The resolved seagull config.
 */
export async function generateDocsCommand(
  config: ResolvedConfig,
): Promise<void> {
  await generateDocsSite(config);
}
