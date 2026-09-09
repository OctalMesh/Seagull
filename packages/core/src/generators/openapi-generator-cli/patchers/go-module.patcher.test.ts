import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { GenerateContext } from "../../../generator/types";
import {
  GITHUB,
  makeArtifact,
  makeContract,
} from "../../../test-support/fixtures";
import { GoModulePatcher } from "./go-module.patcher";

function makeCtx(overrides: Partial<GenerateContext> = {}): GenerateContext {
  return {
    rootDir: "/repo",
    contract: makeContract(),
    artifact: makeArtifact({
      lang: "go",
      package: undefined,
      goModule: "github.com/octalmesh/ows-contracts",
      goPackageName: "authclient",
    }),
    version: "1.0.0",
    github: GITHUB,
    specInputPath: "/repo/dist/specs/auth.json",
    ...overrides,
  };
}

describe("GoModulePatcher", () => {
  let dir: string;
  const patcher = new GoModulePatcher();

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-gomod-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("rewrites the 'module' line of an existing go.mod to the artifact's goModule", async () => {
    await writeFile(
      path.join(dir, "go.mod"),
      ["module openapi", "", "go 1.21", ""].join("\n"),
    );

    await patcher.patch(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "go",
          package: undefined,
          goModule: "github.com/octalmesh/ows-contracts",
        }),
      }),
    );

    const content = await readFile(path.join(dir, "go.mod"), "utf8");

    expect(content).toContain("module github.com/octalmesh/ows-contracts");
    expect(content).toContain("go 1.21");
  });

  it("only replaces the module line, leaving the rest of the file untouched", async () => {
    await writeFile(
      path.join(dir, "go.mod"),
      ["module old/path", "", "require (", "\tfoo v1.0.0", ")", ""].join("\n"),
    );

    await patcher.patch(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "go",
          package: undefined,
          goModule: "new/module/path",
        }),
      }),
    );

    const content = await readFile(path.join(dir, "go.mod"), "utf8");

    expect(content).toBe(
      ["module new/module/path", "", "require (", "\tfoo v1.0.0", ")", ""].join(
        "\n",
      ),
    );
  });

  it("does nothing (no throw) when the artifact has no goModule", async () => {
    await expect(
      patcher.patch(
        makeCtx({
          artifact: makeArtifact({
            outputDir: dir,
            lang: "go",
            package: undefined,
            goModule: undefined,
          }),
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("silently does nothing when go.mod doesn't exist (e.g. go-server templates)", async () => {
    await mkdir(dir, { recursive: true });

    await expect(
      patcher.patch(
        makeCtx({
          artifact: makeArtifact({
            outputDir: dir,
            lang: "go",
            package: undefined,
            goModule: "github.com/octalmesh/ows-contracts",
          }),
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
