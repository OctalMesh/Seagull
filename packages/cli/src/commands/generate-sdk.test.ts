import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { GenerateContext } from "@octalmesh/seagull-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import {
  makeArtifact,
  makeConfig,
  makeContract,
} from "../test-support/fixtures";

const syncRedoclyConfigMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const resolveVersionMock = vi.fn((..._args: unknown[]) => "1.0.0");
const hashSpecMock = vi.fn((..._args: unknown[]) => "some-hash");
const renderReadmeMock = vi.fn((..._args: unknown[]) =>
  Promise.resolve("# readme\n"),
);

const openApiGeneratorPrepare = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);
const openApiGeneratorGenerate = vi.fn(async (ctx: GenerateContext) => {
  await mkdir(ctx.artifact.outputDir, { recursive: true });
});
const openApiTypescriptPrepare = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);
const openApiTypescriptGenerate = vi.fn(async (ctx: GenerateContext) => {
  await mkdir(ctx.artifact.outputDir, { recursive: true });
});

vi.mock("@octalmesh/seagull-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@octalmesh/seagull-core")>();

  class FakeOpenApiGeneratorCli {
    readonly tool = "openapi-generator";
    prepare = openApiGeneratorPrepare;
    generate = openApiGeneratorGenerate;
  }

  class FakeOpenApiTypescriptGenerator {
    readonly tool = "openapi-typescript";
    prepare = openApiTypescriptPrepare;
    generate = openApiTypescriptGenerate;
  }

  return {
    ...actual,
    syncRedoclyConfig: (...a: unknown[]) => syncRedoclyConfigMock(...a),
    resolveVersion: (...a: unknown[]) => resolveVersionMock(...a),
    hashSpec: (...a: unknown[]) => hashSpecMock(...a),
    renderReadme: (...a: unknown[]) => renderReadmeMock(...a),
    OpenApiGeneratorCli: FakeOpenApiGeneratorCli,
    OpenApiTypescriptGenerator: FakeOpenApiTypescriptGenerator,
  };
});

const { generateSdkCommand } = await import("./generate-sdk");

describe("generateSdkCommand", () => {
  let dir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-gensdk-"));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    syncRedoclyConfigMock.mockClear();
    resolveVersionMock.mockClear().mockReturnValue("1.0.0");
    hashSpecMock.mockClear().mockReturnValue("some-hash");
    renderReadmeMock.mockClear().mockResolvedValue("# readme\n");
    openApiGeneratorPrepare.mockClear();
    openApiGeneratorGenerate.mockClear();
    openApiTypescriptPrepare.mockClear();
    openApiTypescriptGenerate.mockClear();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  async function writeSpec(
    specsDir: string,
    name: string,
    raw = '{"info":{"version":"1.0.0"}}',
  ): Promise<void> {
    await mkdir(specsDir, { recursive: true });
    await writeFile(path.join(specsDir, `${name}.json`), raw);
  }

  it("syncs redocly.yaml before generating", async () => {
    const config = makeConfig(dir, { contracts: [] });

    await writeSpec(config.paths.specs, "auth");

    await generateSdkCommand(config);

    expect(syncRedoclyConfigMock).toHaveBeenCalledOnce();
  });

  it("recreates the sdk output directory", async () => {
    const config = makeConfig(dir, { contracts: [] });

    await mkdir(config.paths.sdk, { recursive: true });
    await writeFile(path.join(config.paths.sdk, "stale.txt"), "x");

    await generateSdkCommand(config);

    await expect(
      readFile(path.join(config.paths.sdk, "stale.txt"), "utf8"),
    ).rejects.toThrow();
  });

  it("calls prepare() once per distinct tool present among the artifacts, with only its own entries", async () => {
    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [
            makeArtifact({
              id: "ts-client",
              tool: "openapi-generator",
              outputDir: path.join(dir, "dist", "sdk", "auth", "ts-client"),
            }),
            makeArtifact({
              id: "ts-server",
              tool: "openapi-typescript",
              outputDir: path.join(dir, "dist", "sdk", "auth", "ts-server"),
            }),
          ],
        }),
      ],
    });

    await writeSpec(config.paths.specs, "auth");

    await generateSdkCommand(config);

    expect(openApiGeneratorPrepare).toHaveBeenCalledOnce();
    expect(openApiGeneratorPrepare.mock.calls[0]![0]).toMatchObject({
      rootDir: config.rootDir,
      entries: [{ artifact: { id: "ts-client" } }],
    });

    expect(openApiTypescriptPrepare).toHaveBeenCalledOnce();
    expect(openApiTypescriptPrepare.mock.calls[0]![0]).toMatchObject({
      rootDir: config.rootDir,
      entries: [{ artifact: { id: "ts-server" } }],
    });
  });

  it("calls generate() once per artifact, with the right generator dispatched by tool", async () => {
    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [
            makeArtifact({
              id: "ts-client",
              tool: "openapi-generator",
              outputDir: path.join(dir, "dist", "sdk", "auth", "ts-client"),
            }),
          ],
        }),
      ],
    });

    await writeSpec(config.paths.specs, "auth");
    await mkdir(path.dirname(config.contracts[0]!.artifacts[0]!.outputDir), {
      recursive: true,
    });
    await mkdir(config.contracts[0]!.artifacts[0]!.outputDir, {
      recursive: true,
    });

    await generateSdkCommand(config);

    expect(openApiGeneratorGenerate).toHaveBeenCalledOnce();
    expect(openApiTypescriptGenerate).not.toHaveBeenCalled();

    const ctx = openApiGeneratorGenerate.mock.calls[0]![0];

    expect(ctx).toMatchObject({
      rootDir: config.rootDir,
      version: "1.0.0",
      specInputPath: path.join(config.paths.specs, "auth.json"),
    });
  });

  it("resolves version/hash from the bundled spec once per contract, caching across its artifacts", async () => {
    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [
            makeArtifact({
              id: "ts-client",
              tool: "openapi-generator",
              outputDir: path.join(dir, "dist", "sdk", "auth", "ts-client"),
            }),
            makeArtifact({
              id: "ts-server",
              tool: "openapi-typescript",
              outputDir: path.join(dir, "dist", "sdk", "auth", "ts-server"),
            }),
          ],
        }),
      ],
    });

    await writeSpec(config.paths.specs, "auth", '{"info":{"version":"2.0.0"}}');
    for (const artifact of config.allArtifacts) {
      await mkdir(artifact.artifact.outputDir, { recursive: true });
    }

    await generateSdkCommand(config);

    expect(resolveVersionMock).toHaveBeenCalledTimes(1);
    expect(hashSpecMock).toHaveBeenCalledTimes(1);
    expect(resolveVersionMock).toHaveBeenCalledWith(
      { info: { version: "2.0.0" } },
      "auth",
    );
  });

  it("writes VERSION, SPEC_HASH, and README.md into each artifact's outputDir", async () => {
    const outputDir = path.join(dir, "dist", "sdk", "auth", "ts-client");
    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    resolveVersionMock.mockReturnValue("3.4.5");
    hashSpecMock.mockReturnValue("abc123");
    renderReadmeMock.mockResolvedValue("# Hello\n");

    await writeSpec(config.paths.specs, "auth");
    await mkdir(outputDir, { recursive: true });

    await generateSdkCommand(config);

    await expect(
      readFile(path.join(outputDir, "VERSION"), "utf8"),
    ).resolves.toBe("3.4.5\n");
    await expect(
      readFile(path.join(outputDir, "SPEC_HASH"), "utf8"),
    ).resolves.toBe("abc123\n");
    await expect(
      readFile(path.join(outputDir, "README.md"), "utf8"),
    ).resolves.toBe("# Hello\n");
  });

  it("passes contract/artifact/version/github/vars through to renderReadme", async () => {
    const outputDir = path.join(dir, "dist", "sdk", "auth", "ts-client");
    const config = makeConfig(dir, {
      vars: { org: "octalmesh" },
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    await writeSpec(config.paths.specs, "auth");
    await mkdir(outputDir, { recursive: true });

    await generateSdkCommand(config);

    expect(renderReadmeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        version: "1.0.0",
        github: config.github,
        vars: { org: "octalmesh" },
      }),
    );
  });

  it("logs a summary listing each contract's resolved version", async () => {
    const outputDir = path.join(dir, "dist", "sdk", "auth", "ts-client");
    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    resolveVersionMock.mockReturnValue("9.9.9");

    await writeSpec(config.paths.specs, "auth");
    await mkdir(outputDir, { recursive: true });

    await generateSdkCommand(config);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("auth@9.9.9"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Generated 1"));
  });
});
