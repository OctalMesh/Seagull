import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GenerateContext } from "../../../generator/types";
import type { Patcher } from "./patcher";

/**
 * Patches the `pom.xml` file in a generated Java SDK package to set the correct
 * version and distribution management information for publishing, using the
 * artifact's resolved `publishing:` config rather than a hardcoded registry.
 */
export class MavenPomPatcher implements Patcher {
  async patch({ artifact, version }: GenerateContext): Promise<void> {
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
            `      <id>${artifact.publishing.mavenRepositoryId}</id>`,
            `      <url>${artifact.publishing.mavenRepositoryUrl}</url>`,
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
