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
import { NpmPackagePatcher } from "./npm.patcher";

function makeCtx(overrides: Partial<GenerateContext> = {}): GenerateContext {
  return {
    rootDir: "/repo",
    contract: makeContract(),
    artifact: makeArtifact(),
    version: "1.0.0",
    github: GITHUB,
    specInputPath: "/repo/dist/specs/auth.json",
    ...overrides,
  };
}

describe("NpmPackagePatcher", () => {
  let dir: string;
  const patcher = new NpmPackagePatcher();

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-npmpkg-"));
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(
        { name: "@octalmesh/auth-client", version: "0.0.0", main: "index.js" },
        null,
        2,
      ),
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("sets 'version' to the resolved version", async () => {
    await patcher.patch(
      makeCtx({ version: "3.1.4", artifact: makeArtifact({ outputDir: dir }) }),
    );

    const pkg = JSON.parse(
      await readFile(path.join(dir, "package.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(pkg.version).toBe("3.1.4");
  });

  it("sets 'repository' from artifact.publishing.repositoryUrl, git+ prefixed and .git suffixed", async () => {
    await patcher.patch(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          publishing: {
            branch: "sdk/svc-auth/ts-client",
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

    const pkg = JSON.parse(
      await readFile(path.join(dir, "package.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(pkg.repository).toEqual({
      type: "git",
      url: "git+https://github.com/OctalMesh/ows-contracts.git",
    });
  });

  it("sets 'publishConfig' from artifact.publishing.npmRegistry/npmAccess", async () => {
    await patcher.patch(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          publishing: {
            branch: "sdk/svc-auth/ts-client",
            tagTemplate: "svc-{service}-{id}-v{version}",
            repositoryUrl: "https://github.com/OctalMesh/ows-contracts",
            npmRegistry: "https://custom.registry.example.com",
            npmAccess: "restricted",
            mavenRepositoryId: "github",
            mavenRepositoryUrl:
              "https://maven.pkg.github.com/OctalMesh/ows-contracts",
          },
        }),
      }),
    );

    const pkg = JSON.parse(
      await readFile(path.join(dir, "package.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(pkg.publishConfig).toEqual({
      registry: "https://custom.registry.example.com",
      access: "restricted",
    });
  });

  it("preserves fields it doesn't own (e.g. 'main' emitted by openapi-generator-cli)", async () => {
    await patcher.patch(
      makeCtx({ artifact: makeArtifact({ outputDir: dir }) }),
    );

    const pkg = JSON.parse(
      await readFile(path.join(dir, "package.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(pkg.name).toBe("@octalmesh/auth-client");
    expect(pkg.main).toBe("index.js");
  });

  it("rejects when package.json doesn't exist (unlike the go/maven patchers, this one is not tolerant)", async () => {
    await rm(path.join(dir, "package.json"));

    await expect(
      patcher.patch(makeCtx({ artifact: makeArtifact({ outputDir: dir }) })),
    ).rejects.toThrow();
  });
});
