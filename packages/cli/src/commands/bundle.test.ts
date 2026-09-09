import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import { makeConfig, makeContract } from "../test-support/fixtures";

const runMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const resolveBinPathMock = vi.fn(
  (..._args: unknown[]) => "/fake/bin/redocly.js",
);
const syncRedoclyConfigMock = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("@octalmesh/seagull-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@octalmesh/seagull-core")>();

  return {
    ...actual,
    run: (...a: unknown[]) => runMock(...a),
    resolveBinPath: (...a: unknown[]) => resolveBinPathMock(...a),
    syncRedoclyConfig: (...a: unknown[]) => syncRedoclyConfigMock(...a),
  };
});

const { bundleCommand } = await import("./bundle");

describe("bundleCommand", () => {
  let dir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-bundle-"));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    runMock.mockClear();
    resolveBinPathMock.mockClear();
    syncRedoclyConfigMock.mockClear();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  it("syncs redocly.yaml before bundling", async () => {
    await bundleCommand(makeConfig(dir, { contracts: [] }));

    expect(syncRedoclyConfigMock).toHaveBeenCalledOnce();
  });

  it("recreates the specs output directory (clears stale output first)", async () => {
    const config = makeConfig(dir, { contracts: [] });

    await mkdir(config.paths.specs, { recursive: true });
    await writeFile(path.join(config.paths.specs, "stale.json"), "{}");

    await bundleCommand(config);

    const entries = await readdir(config.paths.specs);

    expect(entries).toEqual([]);
  });

  it("invokes redocly bundle once per contract, with -o <specs>/<name>.json", async () => {
    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          name: "auth",
          entrypoint: "/repo/specs/auth/openapi.yaml",
        }),
        makeContract({
          name: "catalog",
          entrypoint: "/repo/specs/catalog/openapi.yaml",
        }),
      ],
    });

    await bundleCommand(config);

    expect(resolveBinPathMock).toHaveBeenCalledWith("@redocly/cli", "redocly");
    expect(runMock).toHaveBeenCalledTimes(2);
    expect(runMock).toHaveBeenNthCalledWith(
      1,
      "node",
      [
        "/fake/bin/redocly.js",
        "bundle",
        "/repo/specs/auth/openapi.yaml",
        "-o",
        path.join(config.paths.specs, "auth.json"),
      ],
      config.rootDir,
    );
    expect(runMock).toHaveBeenNthCalledWith(
      2,
      "node",
      [
        "/fake/bin/redocly.js",
        "bundle",
        "/repo/specs/catalog/openapi.yaml",
        "-o",
        path.join(config.paths.specs, "catalog.json"),
      ],
      config.rootDir,
    );
  });

  it("logs a summary with the number of bundled specs and the output dir", async () => {
    const config = makeConfig(dir, {
      contracts: [
        makeContract({ name: "auth" }),
        makeContract({ name: "catalog" }),
      ],
    });

    await bundleCommand(config);

    expect(logSpy).toHaveBeenCalledWith(
      `Bundled 2 specifications into ${config.paths.specs}`,
    );
  });
});
