import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import { makeConfig } from "../test-support/fixtures";
import { cleanCommand } from "./clean";

describe("cleanCommand", () => {
  let dir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-clean-"));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  it("removes the dist directory recursively", async () => {
    const config = makeConfig(dir);

    await mkdir(path.join(config.paths.dist, "sdk", "auth"), {
      recursive: true,
    });
    await writeFile(
      path.join(config.paths.dist, "sdk", "auth", "file.txt"),
      "hi",
    );

    await cleanCommand(config);

    await expect(stat(config.paths.dist)).rejects.toThrow();
  });

  it("does not throw when dist doesn't exist (force: true)", async () => {
    await expect(cleanCommand(makeConfig(dir))).resolves.toBeUndefined();
  });

  it("logs the cleaned path", async () => {
    const config = makeConfig(dir);

    await mkdir(config.paths.dist, { recursive: true });

    await cleanCommand(config);

    expect(logSpy).toHaveBeenCalledWith(`Cleaned ${config.paths.dist}`);
  });

  it("only removes 'dist', leaving sibling files in rootDir untouched", async () => {
    const config = makeConfig(dir);

    await mkdir(config.paths.dist, { recursive: true });
    await writeFile(path.join(dir, "seagull.yaml"), "configVersion: 1");

    await cleanCommand(config);

    await expect(stat(path.join(dir, "seagull.yaml"))).resolves.toMatchObject(
      {},
    );
  });
});
