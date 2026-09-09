import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import { makeConfig } from "./test-support/fixtures";

const loadConfigMock = vi.fn<(...args: unknown[]) => unknown>();
const resolveConfigPathMock = vi.fn(
  (..._args: unknown[]) => "/repo/seagull.yaml",
);

const lintCommandMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const bundleCommandMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const generateSdkCommandMock = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);
const cleanCommandMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const generateDocsCommandMock = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);
const serveDocsCommandMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const publishSdkCommandMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const publishRegistriesCommandMock = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);

vi.mock("@octalmesh/seagull-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@octalmesh/seagull-core")>();

  return {
    ...actual,
    loadConfig: (...a: unknown[]) => loadConfigMock(...a),
    resolveConfigPath: (...a: unknown[]) => resolveConfigPathMock(...a),
  };
});

vi.mock("./commands/lint", () => ({
  lintCommand: (...a: unknown[]) => lintCommandMock(...a),
}));
vi.mock("./commands/bundle", () => ({
  bundleCommand: (...a: unknown[]) => bundleCommandMock(...a),
}));
vi.mock("./commands/generate-sdk", () => ({
  generateSdkCommand: (...a: unknown[]) => generateSdkCommandMock(...a),
}));
vi.mock("./commands/clean", () => ({
  cleanCommand: (...a: unknown[]) => cleanCommandMock(...a),
}));
vi.mock("./commands/generate-docs", () => ({
  generateDocsCommand: (...a: unknown[]) => generateDocsCommandMock(...a),
}));
vi.mock("./commands/serve-docs", () => ({
  serveDocsCommand: (...a: unknown[]) => serveDocsCommandMock(...a),
}));
vi.mock("./commands/publish-sdk", () => ({
  publishSdkCommand: (...a: unknown[]) => publishSdkCommandMock(...a),
}));
vi.mock("./commands/publish-registries", () => ({
  publishRegistriesCommand: (...a: unknown[]) =>
    publishRegistriesCommandMock(...a),
}));

const { createProgram } = await import("./program");

const metadata = {
  name: "seagull",
  version: "0.0.2",
  description: "test program",
};

describe("createProgram", () => {
  let logSpy: MockInstance;
  let errorSpy: MockInstance;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = undefined;

    for (const mock of [
      loadConfigMock,
      resolveConfigPathMock,
      lintCommandMock,
      bundleCommandMock,
      generateSdkCommandMock,
      cleanCommandMock,
      generateDocsCommandMock,
      serveDocsCommandMock,
      publishSdkCommandMock,
      publishRegistriesCommandMock,
    ]) {
      mock.mockClear();
    }

    resolveConfigPathMock.mockReturnValue("/repo/seagull.yaml");
    loadConfigMock.mockReturnValue(makeConfig("/repo"));
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it("sets name/description/version from the provided metadata", () => {
    const program = createProgram(metadata);

    expect(program.name()).toBe("seagull");
    expect(program.description()).toBe("test program");
    expect(program.version()).toBe("0.0.2");
  });

  it("registers all eight subcommands (including docs/publish sub-groups)", () => {
    const program = createProgram(metadata);
    const names = program.commands.map((c) => c.name());

    expect(names.sort()).toEqual(
      ["bundle", "clean", "docs", "generate", "lint", "publish"].sort(),
    );

    const docs = program.commands.find((c) => c.name() === "docs")!;
    expect(docs.commands.map((c) => c.name()).sort()).toEqual([
      "generate",
      "serve",
    ]);

    const publish = program.commands.find((c) => c.name() === "publish")!;
    expect(publish.commands.map((c) => c.name()).sort()).toEqual([
      "registries",
      "sdk",
    ]);
  });

  it("auto-discovers the config file when --config isn't given", async () => {
    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "lint"]);

    expect(resolveConfigPathMock).toHaveBeenCalledWith(process.cwd());
    expect(loadConfigMock).toHaveBeenCalledWith("/repo/seagull.yaml");
    expect(lintCommandMock).toHaveBeenCalledOnce();
  });

  it("uses the --config path (resolved against cwd) instead of auto-discovery when given", async () => {
    const program = createProgram(metadata);

    await program.parseAsync([
      "node",
      "seagull",
      "--config",
      "custom.yaml",
      "lint",
    ]);

    expect(resolveConfigPathMock).not.toHaveBeenCalled();
    expect(loadConfigMock).toHaveBeenCalledWith(
      path.resolve(process.cwd(), "custom.yaml"),
    );
  });

  it("routes 'bundle' to bundleCommand with the resolved config", async () => {
    const config = makeConfig("/repo");

    loadConfigMock.mockReturnValue(config);

    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "bundle"]);

    expect(bundleCommandMock).toHaveBeenCalledWith(config);
  });

  it("routes 'generate' to generateSdkCommand", async () => {
    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "generate"]);

    expect(generateSdkCommandMock).toHaveBeenCalledOnce();
  });

  it("routes 'clean' to cleanCommand", async () => {
    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "clean"]);

    expect(cleanCommandMock).toHaveBeenCalledOnce();
  });

  it("routes 'docs generate' and 'docs serve' to their respective commands", async () => {
    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "docs", "generate"]);
    await program.parseAsync(["node", "seagull", "docs", "serve"]);

    expect(generateDocsCommandMock).toHaveBeenCalledOnce();
    expect(serveDocsCommandMock).toHaveBeenCalledOnce();
  });

  it("routes 'publish sdk' with dryRun:false by default, and forwards --dry-run", async () => {
    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "publish", "sdk"]);
    expect(publishSdkCommandMock).toHaveBeenLastCalledWith(expect.anything(), {
      dryRun: undefined,
    });

    await program.parseAsync([
      "node",
      "seagull",
      "publish",
      "sdk",
      "--dry-run",
    ]);
    expect(publishSdkCommandMock).toHaveBeenLastCalledWith(expect.anything(), {
      dryRun: true,
    });
  });

  it("routes 'publish registries' with --dry-run forwarded", async () => {
    const program = createProgram(metadata);

    await program.parseAsync([
      "node",
      "seagull",
      "publish",
      "registries",
      "--dry-run",
    ]);

    expect(publishRegistriesCommandMock).toHaveBeenCalledWith(
      expect.anything(),
      { dryRun: true },
    );
  });

  it("prints 'seagull: <message>' and sets exitCode=1 when a command throws", async () => {
    lintCommandMock.mockRejectedValueOnce(new Error("spec is invalid"));

    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "lint"]);

    expect(errorSpy).toHaveBeenCalledWith("seagull: spec is invalid");
    expect(process.exitCode).toBe(1);
  });

  it("prints a stringified error and sets exitCode=1 when a non-Error is thrown", async () => {
    lintCommandMock.mockRejectedValueOnce("just a string");

    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "lint"]);

    expect(errorSpy).toHaveBeenCalledWith("seagull: just a string");
    expect(process.exitCode).toBe(1);
  });

  it("does not touch exitCode when a command succeeds", async () => {
    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "lint"]);

    expect(process.exitCode).toBeUndefined();
  });

  it("propagates a config-loading error (e.g. invalid config) through the same error handler", async () => {
    loadConfigMock.mockImplementationOnce(() => {
      throw new Error("Invalid seagull.yaml");
    });

    const program = createProgram(metadata);

    await program.parseAsync(["node", "seagull", "bundle"]);

    expect(errorSpy).toHaveBeenCalledWith("seagull: Invalid seagull.yaml");
    expect(process.exitCode).toBe(1);
    expect(bundleCommandMock).not.toHaveBeenCalled();
  });
});
