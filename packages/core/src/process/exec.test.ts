import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { run, runSync } from "./exec";

const spawnMock = vi.fn<(...args: unknown[]) => unknown>();
const spawnSyncMock = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
  spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}));

class FakeChildProcess extends EventEmitter {}

describe("run", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("spawns the command with inherited stdio and shell:true", async () => {
    const child = new FakeChildProcess();

    spawnMock.mockReturnValue(child);

    const promise = run("redocly", ["lint", "spec.yaml"], "/repo");

    child.emit("close", 0);
    await promise;

    expect(spawnMock).toHaveBeenCalledWith("redocly", ["lint", "spec.yaml"], {
      cwd: "/repo",
      stdio: "inherit",
      shell: true,
    });
  });

  it("resolves when the process exits 0", async () => {
    const child = new FakeChildProcess();

    spawnMock.mockReturnValue(child);

    const promise = run("cmd", [], "/repo");

    child.emit("close", 0);

    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects with a descriptive error when the process exits non-zero", async () => {
    const child = new FakeChildProcess();

    spawnMock.mockReturnValue(child);

    const promise = run("cmd", ["arg1", "arg2"], "/repo");

    child.emit("close", 2);

    await expect(promise).rejects.toThrow("cmd arg1 arg2 exited with 2");
  });

  it("rejects when the process exits with a null code (e.g. killed by signal)", async () => {
    const child = new FakeChildProcess();

    spawnMock.mockReturnValue(child);

    const promise = run("cmd", [], "/repo");

    child.emit("close", null);

    await expect(promise).rejects.toThrow("cmd  exited with null");
  });
});

describe("runSync", () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it("runs the command synchronously with inherited stdio and shell:true", () => {
    spawnSyncMock.mockReturnValue({ status: 0 });

    const status = runSync("git", ["status"], "/repo");

    expect(status).toBe(0);
    expect(spawnSyncMock).toHaveBeenCalledWith("git", ["status"], {
      cwd: "/repo",
      stdio: "inherit",
      shell: true,
    });
  });

  it("returns the non-zero exit status as-is", () => {
    spawnSyncMock.mockReturnValue({ status: 1 });

    expect(runSync("cmd", [], "/repo")).toBe(1);
  });

  it("defaults to status 1 when 'status' is null", () => {
    spawnSyncMock.mockReturnValue({ status: null });

    expect(runSync("cmd", [], "/repo")).toBe(1);
  });
});
