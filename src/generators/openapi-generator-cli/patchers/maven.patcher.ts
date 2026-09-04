import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GenerateContext } from "@core/generator/types";

import type { Patcher } from "./patcher";

/**
 * Patches the `pom.xml` file in a generated Java SDK package to set the correct
 * version and distribution management information for publishing.
 */
export class MavenPomPatcher implements Patcher {
  async patch({ artifact, version, github }: GenerateContext): Promise<void> {
    const pomFile = path.join(artifact.outputDir, "pom.xml");

    try {
      let pom = await readFile(pomFile, "utf8");

      pom = pom.replace(
        /<version>[^<]*<\/version>/,
        `<version>${version}</version>`,
      );

      if (!pom.includes("<distributionManagement>")) {
        pom = pom.replace(
          "</project>",
          [
            "  <distributionManagement>",
            "    <repository>",
            "      <id>github</id>",
            `      <n>${github.owner} ${github.repo} Packages</n>`,
            `      <url>https://maven.pkg.github.com/${github.owner}/${github.repo}</url>`,
            "    </repository>",
            "  </distributionManagement>",
            "</project>",
          ].join("\n"),
        );
      }

      await writeFile(pomFile, pom);
    } catch {
      // pom.xml absent (e.g. Gradle build selected)
    }
  }
}
