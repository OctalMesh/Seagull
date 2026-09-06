import type { ResolvedConfig } from "@octalmesh/seagull-core";
import { serveDocsSite } from "@octalmesh/seagull-docs";

/**
 * Serves the generated documentation site (`dist/docs`) over plain HTTP for
 * local previewing. Delegates to `@octalmesh/seagull-docs`.
 *
 * @param config - The resolved seagull config.
 */
export async function serveDocsCommand(config: ResolvedConfig): Promise<void> {
  await serveDocsSite(config);
}
