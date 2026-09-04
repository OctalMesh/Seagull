import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

/**
 * Resolves the absolute path to an installed npm package's own CLI entrypoint
 * script, using Node's standard module resolution algorithm - so it works the
 * same way regardless of which package manager (npm/pnpm/yarn) installed CLI
 * and its dependencies, or how deeply they get hoisted. Shelling out to
 * `pnpm exec`/`npx` instead would assume a specific package manager and a
 * particular install layout, which doesn't hold once CLI is just another
 * dependency in someone else's project.
 *
 * @param pkgName - The npm package name, e.g. `"@org/cli"`.
 * @param binName - Which entry to resolve from that package's `bin` field.
 *                  Defaults to the package's own unscoped name.
 * @returns The absolute path to the resolved bin script.
 * @throws Error if the package or the requested bin entry can't be found.
 */
export function resolveBinPath(pkgName: string, binName?: string): string {
  const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
  const pkgDir = path.dirname(pkgJsonPath);
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
    name: string;
    bin?: string | Record<string, string>;
  };

  const key = binName ?? pkg.name.split("/").pop()!;
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[key];

  if (!bin) {
    throw new Error(
      `Could not resolve a "${key}" bin entry for package "${pkgName}" - ` +
        `is it installed, and does it expose that bin?`,
    );
  }

  return path.join(pkgDir, bin);
}
