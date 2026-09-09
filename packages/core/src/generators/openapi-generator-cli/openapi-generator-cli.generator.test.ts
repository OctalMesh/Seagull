import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GenerateContext } from "../../generator/types";
import {
  GITHUB,
  makeArtifact,
  makeContract,
} from "../../test-support/fixtures";

const runMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const resolveBinPathMock = vi.fn(
  (..._args: unknown[]) => "/fake/bin/openapi-generator-cli.js",
);
const patchMocks = {
  go: vi.fn((..._args: unknown[]) => Promise.resolve()),
  typescript: vi.fn((..._args: unknown[]) => Promise.resolve()),
  java: vi.fn((..._args: unknown[]) => Promise.resolve()),
};

vi.mock("../../process/exec", () => ({
  run: (...a: unknown[]) => runMock(...a),
}));
vi.mock("../../process/resolve-bin", () => ({
  resolveBinPath: (...a: unknown[]) => resolveBinPathMock(...a),
}));
vi.mock("./patchers/go-module.patcher", () => ({
  GoModulePatcher: class {
    patch = patchMocks.go;
  },
}));
vi.mock("./patchers/npm.patcher", () => ({
  NpmPackagePatcher: class {
    patch = patchMocks.typescript;
  },
}));
vi.mock("./patchers/maven.patcher", () => ({
  MavenPomPatcher: class {
    patch = patchMocks.java;
  },
}));

const { OpenApiGeneratorCli } =
  await import("./openapi-generator-cli.generator");

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

describe("OpenApiGeneratorCli", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-ogc-"));
    runMock.mockClear();
    resolveBinPathMock.mockClear();
    patchMocks.go.mockClear();
    patchMocks.typescript.mockClear();
    patchMocks.java.mockClear();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("exposes 'tool' as \"openapi-generator\"", () => {
    expect(new OpenApiGeneratorCli().tool).toBe("openapi-generator");
  });

  it("creates the artifact's output directory", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await new OpenApiGeneratorCli().generate(
      makeCtx({ artifact: makeArtifact({ outputDir }) }),
    );

    await expect(stat(outputDir)).resolves.toMatchObject({});
  });

  it("throws when the artifact has no 'generator' value", async () => {
    await expect(
      new OpenApiGeneratorCli().generate(
        makeCtx({
          artifact: makeArtifact({ id: "weird", generator: undefined }),
        }),
      ),
    ).rejects.toThrow(
      /Artifact "weird" uses tool "openapi-generator" but has no "generator" value/,
    );
  });

  it("resolves the openapi-generator-cli bin and invokes it with the expected flags", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({ outputDir, generator: "typescript-fetch" }),
        specInputPath: "/repo/dist/specs/auth.json",
      }),
    );

    expect(resolveBinPathMock).toHaveBeenCalledWith(
      "@openapitools/openapi-generator-cli",
      "openapi-generator-cli",
    );
    expect(runMock).toHaveBeenCalledWith(
      "node",
      [
        "/fake/bin/openapi-generator-cli.js",
        "generate",
        "-i",
        "/repo/dist/specs/auth.json",
        "-g",
        "typescript-fetch",
        "-o",
        outputDir,
        expect.stringMatching(/^--additional-properties=/),
      ],
      "/repo",
    );
  });

  it("derives npmName from artifact.package for typescript artifacts", async () => {
    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "typescript",
          package: "@octalmesh/auth-client",
        }),
      }),
    );

    const [, args] = runMock.mock.calls[0]!;
    const flag = (args as string[]).find((a) =>
      a.startsWith("--additional-properties="),
    )!;

    expect(flag).toContain("npmName=@octalmesh/auth-client");
  });

  it("derives packageName from artifact.goPackageName for go artifacts", async () => {
    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "go",
          package: undefined,
          goModule: "github.com/octalmesh/ows-contracts",
          goPackageName: "authclient",
        }),
      }),
    );

    const [, args] = runMock.mock.calls[0]!;
    const flag = (args as string[]).find((a) =>
      a.startsWith("--additional-properties="),
    )!;

    expect(flag).toContain("packageName=authclient");
  });

  it("derives groupId/artifactId/invokerPackage/apiPackage/modelPackage for java artifacts", async () => {
    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "java",
          kind: "client",
          package: undefined,
          maven: { groupId: "com.octalmesh.auth", artifactId: "auth-client" },
        }),
      }),
    );

    const [, args] = runMock.mock.calls[0]!;
    const flag = (args as string[]).find((a) =>
      a.startsWith("--additional-properties="),
    )!;

    expect(flag).toContain("groupId=com.octalmesh.auth");
    expect(flag).toContain("artifactId=auth-client");
    expect(flag).toContain("invokerPackage=com.octalmesh.auth.client");
    expect(flag).toContain("apiPackage=com.octalmesh.auth.client.api");
    expect(flag).toContain("modelPackage=com.octalmesh.auth.client.model");
  });

  it("layers the artifact's own additionalProperties on top of derived ones, with explicit values winning", async () => {
    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "typescript",
          package: "@octalmesh/auth-client",
          additionalProperties: {
            npmName: "@octalmesh/explicit-override",
            supportsES6: true,
          },
        }),
      }),
    );

    const [, args] = runMock.mock.calls[0]!;
    const flag = (args as string[]).find((a) =>
      a.startsWith("--additional-properties="),
    )!;

    expect(flag).toContain("npmName=@octalmesh/explicit-override");
    expect(flag).toContain("supportsES6=true");
    expect(flag).not.toContain("npmName=@octalmesh/auth-client,");
  });

  it("dispatches to the go patcher for lang 'go'", async () => {
    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "go",
          package: undefined,
        }),
      }),
    );

    expect(patchMocks.go).toHaveBeenCalledOnce();
    expect(patchMocks.typescript).not.toHaveBeenCalled();
    expect(patchMocks.java).not.toHaveBeenCalled();
  });

  it("dispatches to the npm patcher for lang 'typescript'", async () => {
    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({ outputDir: dir, lang: "typescript" }),
      }),
    );

    expect(patchMocks.typescript).toHaveBeenCalledOnce();
  });

  it("dispatches to the maven patcher for lang 'java'", async () => {
    await new OpenApiGeneratorCli().generate(
      makeCtx({
        artifact: makeArtifact({
          outputDir: dir,
          lang: "java",
          package: undefined,
          maven: { groupId: "com.octalmesh.auth", artifactId: "auth-client" },
        }),
      }),
    );

    expect(patchMocks.java).toHaveBeenCalledOnce();
  });
});
