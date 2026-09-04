import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GenerateContext } from "@core/generator/types";

import type { Patcher } from "./patcher";

/**
 * Patches the `go.mod` file in a generated Go SDK package to set the correct
 * module path (`openapi-generator-cli` has no way to be told this up front for
 * every template).
 */
export class GoModulePatcher implements Patcher {
  async patch({ artifact }: GenerateContext): Promise<void> {
    if (!artifact.goModule) {
      return;
    }

    const moduleFile = path.join(artifact.outputDir, "go.mod");

    try {
      const contents = await readFile(moduleFile, "utf8");

      await writeFile(
        moduleFile,
        contents.replace(/^module .*$/m, `module ${artifact.goModule}`),
      );
    } catch {
      // go-server templates don't always emit go.mod
    }
  }
}
