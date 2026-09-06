import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GenerateContext } from "../../../generator/types";
import type { Patcher } from "./patcher";

/**
 * Patches the `package.json` file in a generated TypeScript SDK package (the
 * client target - `openapi-generator-cli` produces its own `package.json`, this
 * just fills in the version and publishing metadata) to set the correct version
 * and repository information, using the artifact's resolved `publishing:`
 * config rather than a hardcoded registry.
 */
export class NpmPackagePatcher implements Patcher {
  async patch({ artifact, version }: GenerateContext): Promise<void> {
    const pkgFile = path.join(artifact.outputDir, "package.json");
    const pkgData = await readFile(pkgFile, "utf8");
    const pkg = JSON.parse(pkgData) as Record<string, unknown>;

    pkg.version = version;
    pkg.repository = {
      type: "git",
      url: `git+${artifact.publishing.repositoryUrl}.git`,
    };
    pkg.publishConfig = {
      registry: artifact.publishing.npmRegistry,
      access: artifact.publishing.npmAccess,
    };

    await writeFile(pkgFile, JSON.stringify(pkg, null, 2));
  }
}
