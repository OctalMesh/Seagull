import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GenerateContext } from "@core/generator/types";

import type { Patcher } from "./patcher";

/**
 * Patches the `package.json` file in a generated TypeScript SDK package (the
 * client target - `openapi-generator-cli` produces its own `package.json`, this
 * just fills in the version and publishing metadata) to set the correct version
 * and repository information.
 */
export class NpmPackagePatcher implements Patcher {
  async patch({
    contract,
    artifact,
    version,
    github,
  }: GenerateContext): Promise<void> {
    const pkgFile = path.join(artifact.outputDir, "package.json");
    const pkgData = await readFile(pkgFile, "utf8");
    const pkg = JSON.parse(pkgData) as Record<string, unknown>;

    pkg.version = version;
    pkg.repository = {
      type: "git",
      url: `git+https://github.com/${github.owner}/${github.repo}.git`,
      directory: `sdk/svc-${contract.name}/${artifact.id}`,
    };
    pkg.publishConfig = {
      registry: "https://npm.pkg.github.com",
      access: "restricted",
    };

    await writeFile(pkgFile, JSON.stringify(pkg, null, 2));
  }
}
