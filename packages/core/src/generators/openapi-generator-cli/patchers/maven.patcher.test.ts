import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { GenerateContext } from "../../../generator/types";
import {
  GITHUB,
  makeArtifact,
  makeContract,
} from "../../../test-support/fixtures";
import { MavenPomPatcher } from "./maven.patcher";

function makeCtx(overrides: Partial<GenerateContext> = {}): GenerateContext {
  return {
    rootDir: "/repo",
    contract: makeContract(),
    artifact: makeArtifact({
      lang: "java",
      package: undefined,
      maven: { groupId: "com.octalmesh.auth", artifactId: "auth-client" },
    }),
    version: "1.0.0",
    github: GITHUB,
    specInputPath: "/repo/dist/specs/auth.json",
    ...overrides,
  };
}

describe("MavenPomPatcher", () => {
  let dir: string;
  const patcher = new MavenPomPatcher();

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-pom-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("replaces the <version> element with the resolved version", async () => {
    await writeFile(
      path.join(dir, "pom.xml"),
      ["<project>", "  <version>0.0.0</version>", "</project>", ""].join("\n"),
    );

    await patcher.patch(
      makeCtx({
        version: "2.5.0",
        artifact: makeArtifact({
          outputDir: dir,
          lang: "java",
          package: undefined,
        }),
      }),
    );

    const content = await readFile(path.join(dir, "pom.xml"), "utf8");

    expect(content).toContain("<version>2.5.0</version>");
  });

  it("appends <distributionManagement> using the artifact's resolved publishing config", async () => {
    await writeFile(
      path.join(dir, "pom.xml"),
      ["<project>", "  <version>0.0.0</version>", "</project>", ""].join("\n"),
    );

    await patcher.patch(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "java",
          package: undefined,
          publishing: {
            branch: "sdk/svc-auth/java-client",
            tagTemplate: "svc-{service}-{id}-v{version}",
            repositoryUrl: "https://github.com/OctalMesh/ows-contracts",
            npmRegistry: "https://npm.pkg.github.com",
            npmAccess: "public",
            mavenRepositoryId: "github",
            mavenRepositoryUrl:
              "https://maven.pkg.github.com/OctalMesh/ows-contracts",
          },
        }),
      }),
    );

    const content = await readFile(path.join(dir, "pom.xml"), "utf8");

    expect(content).toContain("<distributionManagement>");
    expect(content).toContain("<id>github</id>");
    expect(content).toContain(
      "<url>https://maven.pkg.github.com/OctalMesh/ows-contracts</url>",
    );
    expect(content.indexOf("</distributionManagement>")).toBeLessThan(
      content.indexOf("</project>"),
    );
  });

  it("does not duplicate <distributionManagement> if it's already present", async () => {
    await writeFile(
      path.join(dir, "pom.xml"),
      [
        "<project>",
        "  <version>0.0.0</version>",
        "  <distributionManagement>",
        "    <repository><id>existing</id></repository>",
        "  </distributionManagement>",
        "</project>",
        "",
      ].join("\n"),
    );

    await patcher.patch(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "java",
          package: undefined,
        }),
      }),
    );

    const content = await readFile(path.join(dir, "pom.xml"), "utf8");

    expect(content.split("<distributionManagement>").length - 1).toBe(1);
    expect(content).toContain("<id>existing</id>");
  });

  it("silently does nothing when pom.xml is absent (e.g. Gradle build selected)", async () => {
    await expect(
      patcher.patch(
        makeCtx({
          artifact: makeArtifact({
            outputDir: dir,
            lang: "java",
            package: undefined,
          }),
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
