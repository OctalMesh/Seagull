import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import { makeConfig, makeContract } from "../test-support/fixtures";

const runSyncMock = vi.fn((..._args: unknown[]) => 0);
const resolveBinPathMock = vi.fn(
  (..._args: unknown[]) => "/fake/bin/redocly.js",
);
const syncRedoclyConfigMock = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("@octalmesh/seagull-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@octalmesh/seagull-core")>();

  return {
    ...actual,
    runSync: (...a: unknown[]) => runSyncMock(...a),
    resolveBinPath: (...a: unknown[]) => resolveBinPathMock(...a),
    syncRedoclyConfig: (...a: unknown[]) => syncRedoclyConfigMock(...a),
  };
});

const { lintCommand } = await import("./lint");

describe("lintCommand", () => {
  let logSpy: MockInstance;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    runSyncMock.mockClear().mockReturnValue(0);
    resolveBinPathMock.mockClear();
    syncRedoclyConfigMock.mockClear();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it("syncs redocly.yaml before linting", async () => {
    await lintCommand(makeConfig("/repo", { contracts: [] }));

    expect(syncRedoclyConfigMock).toHaveBeenCalledOnce();
  });

  it("runs 'redocly lint <entrypoint>' once per contract via runSync", async () => {
    const config = makeConfig("/repo", {
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

    await lintCommand(config);

    expect(runSyncMock).toHaveBeenCalledTimes(2);
    expect(runSyncMock).toHaveBeenNthCalledWith(
      1,
      "node",
      ["/fake/bin/redocly.js", "lint", "/repo/specs/auth/openapi.yaml"],
      config.rootDir,
    );
    expect(runSyncMock).toHaveBeenNthCalledWith(
      2,
      "node",
      ["/fake/bin/redocly.js", "lint", "/repo/specs/catalog/openapi.yaml"],
      config.rootDir,
    );
  });

  it("leaves process.exitCode unset when every contract lints cleanly", async () => {
    runSyncMock.mockReturnValue(0);

    await lintCommand(
      makeConfig("/repo", {
        contracts: [
          makeContract({ name: "auth" }),
          makeContract({ name: "catalog" }),
        ],
      }),
    );

    expect(process.exitCode).toBeUndefined();
  });

  it("sets process.exitCode = 1 if any single contract fails", async () => {
    runSyncMock.mockReturnValueOnce(0).mockReturnValueOnce(1);

    await lintCommand(
      makeConfig("/repo", {
        contracts: [
          makeContract({ name: "auth" }),
          makeContract({ name: "catalog" }),
        ],
      }),
    );

    expect(process.exitCode).toBe(1);
  });

  it("keeps checking every contract even after an earlier one fails", async () => {
    runSyncMock.mockReturnValueOnce(1).mockReturnValueOnce(0);

    await lintCommand(
      makeConfig("/repo", {
        contracts: [
          makeContract({ name: "auth" }),
          makeContract({ name: "catalog" }),
        ],
      }),
    );

    expect(runSyncMock).toHaveBeenCalledTimes(2);
    expect(process.exitCode).toBe(1);
  });
});
