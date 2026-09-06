import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Config filenames CLI recognizes, checked in this order.
 */
export const CONFIG_FILENAMES = [
  ".seagull",
  ".seagull.yaml",
  ".seagull.yml",
  "seagull.yaml",
  "seagull.yml",
] as const;

/**
 * Finds the CLI config file in a directory, trying each of
 * {@link CONFIG_FILENAMES} in order.
 *
 * @param cwd - The directory to look in (typically `process.cwd()`).
 * @returns The absolute path to the first matching config file.
 * @throws Error if none of the candidate filenames exist in `cwd`.
 *
 * @see {@link CONFIG_FILENAMES} - the list of filenames checked, in order.
 */
export function resolveConfigPath(cwd: string): string {
  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(cwd, filename);

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `No CLI config found in ${cwd} - looked for: ${CONFIG_FILENAMES.join(", ")}. ` +
      `Create one of these, or pass --config <path>.`,
  );
}
