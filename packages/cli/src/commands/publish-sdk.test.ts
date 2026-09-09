import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { GitResult } from "@octalmesh/seagull-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import {
  makeArtifact,
  makeConfig,
  makeContract,
} from "../test-support/fixtures";

const gitMock = vi.fn<(args: string[], cwd: string) => GitResult>();
const tagExistsMock = vi.fn((..._args: unknown[]) => false);
const remoteBranchExistsMock = vi.fn((..._args: unknown[]) => false);
const readFileAtTagMock = vi.fn((..._args: unknown[]): string | null => null);
const renderArtifactTagMock = vi.fn(
  (..._args: unknown[]) => "svc-auth-ts-client-v1.0.0",
);

vi.mock("@octalmesh/seagull-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@octalmesh/seagull-core")>();

  return {
    ...actual,
    git: (...a: [string[], string]) => gitMock(...a),
    tagExists: (...a: unknown[]) => tagExistsMock(...(a as [string, string])),
    remoteBranchExists: (...a: unknown[]) =>
      remoteBranchExistsMock(...(a as [string, string])),
    readFileAtTag: (...a: unknown[]) =>
      readFileAtTagMock(...(a as [string, string, string])),
    renderArtifactTag: (...a: unknown[]) => renderArtifactTagMock(...a),
  };
});

const { publishSdkCommand } = await import("./publish-sdk");

function defaultGitImpl(args: string[], _cwd?: string): GitResult {
  if (args[0] === "diff") {
    return { status: 1, stdout: "", stderr: "" };
  }

  return { status: 0, stdout: "", stderr: "" };
}

describe("publishSdkCommand", () => {
  let dir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-publishsdk-"));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    gitMock.mockReset().mockImplementation(defaultGitImpl);
    tagExistsMock.mockReset().mockReturnValue(false);
    remoteBranchExistsMock.mockReset().mockReturnValue(false);
    readFileAtTagMock.mockReset().mockReturnValue(null);
    renderArtifactTagMock
      .mockReset()
      .mockReturnValue("svc-auth-ts-client-v1.0.0");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  async function prepareArtifactOutput(
    outputDir: string,
    version = "1.0.0",
    hash = "some-hash",
  ): Promise<void> {
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "VERSION"), `${version}\n`);
    await writeFile(path.join(outputDir, "SPEC_HASH"), `${hash}\n`);
    await writeFile(path.join(outputDir, "index.js"), "module.exports = {};");
  }

  it("skips publishing when the tag already exists with matching spec hash", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir, "1.0.0", "some-hash");
    tagExistsMock.mockReturnValue(true);
    readFileAtTagMock.mockReturnValue("some-hash");

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    await publishSdkCommand(config);

    expect(gitMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("already published"),
    );
  });

  it("throws when the tag exists but the published spec hash has diverged", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir, "1.0.0", "new-hash");
    tagExistsMock.mockReturnValue(true);
    readFileAtTagMock.mockReturnValue("old-hash");

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    await expect(publishSdkCommand(config)).rejects.toThrow(
      /already exists, but the auth spec content has changed/,
    );
  });

  it("treats a null remote spec hash (unreadable tag) as no conflict and skips", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir);
    tagExistsMock.mockReturnValue(true);
    readFileAtTagMock.mockReturnValue(null);

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    await expect(publishSdkCommand(config)).resolves.toBeUndefined();
    expect(gitMock).not.toHaveBeenCalled();
  });

  it("for a brand-new artifact (no remote branch), creates an orphan branch and pushes it", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir);
    remoteBranchExistsMock.mockReturnValue(false);

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [
            makeArtifact({
              id: "ts-client",
              outputDir,
              branch: "sdk/svc-auth/ts-client",
            }),
          ],
        }),
      ],
    });

    await publishSdkCommand(config);

    const calls = gitMock.mock.calls.map(([args]) => args.join(" "));

    expect(calls).toContain("fetch origin sdk/svc-auth/ts-client");
    expect(calls.some((c) => c.startsWith("worktree add --detach "))).toBe(
      true,
    );
    expect(calls).toContain("checkout --orphan sdk/svc-auth/ts-client");
    expect(calls).toContain("rm -rf --quiet .");
    expect(calls).toContain("add -A");
    expect(
      calls.some((c) =>
        c.startsWith("commit -m chore(sdk): publish auth ts-client v1.0.0"),
      ),
    ).toBe(true);
    expect(calls).toContain("tag svc-auth-ts-client-v1.0.0");
    expect(calls).toContain(
      "push origin HEAD:refs/heads/sdk/svc-auth/ts-client",
    );
    expect(calls).toContain("push origin svc-auth-ts-client-v1.0.0");
    expect(calls.some((c) => c.startsWith("worktree remove --force "))).toBe(
      true,
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Published sdk/svc-auth/ts-client @ svc-auth-ts-client-v1.0.0",
      ),
    );
  });

  it("for an existing remote branch, fetches then checks out -B against origin/<branch>", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir);
    remoteBranchExistsMock.mockReturnValue(true);

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [
            makeArtifact({
              id: "ts-client",
              outputDir,
              branch: "sdk/svc-auth/ts-client",
            }),
          ],
        }),
      ],
    });

    await publishSdkCommand(config);

    const calls = gitMock.mock.calls.map(([args]) => args.join(" "));

    expect(
      calls.some(
        (c) =>
          c.startsWith("worktree add ") &&
          c.endsWith("origin/sdk/svc-auth/ts-client"),
      ),
    ).toBe(true);
    expect(calls).toContain(
      "checkout -B sdk/svc-auth/ts-client origin/sdk/svc-auth/ts-client",
    );
    expect(calls).not.toContain("checkout --orphan sdk/svc-auth/ts-client");
  });

  it("in dry-run mode, tags locally but never pushes", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir);

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    await publishSdkCommand(config, { dryRun: true });

    const calls = gitMock.mock.calls.map(([args]) => args.join(" "));

    expect(calls.some((c) => c.startsWith("push"))).toBe(false);
    expect(calls).toContain("tag svc-auth-ts-client-v1.0.0");
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[dry-run] would push"),
    );
  });

  it("skips the commit step (but still tags) when the worktree has no content changes", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir);
    gitMock.mockImplementation((args) => {
      if (args[0] === "diff") {
        return { status: 0, stdout: "", stderr: "" };
      }

      return { status: 0, stdout: "", stderr: "" };
    });

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    await publishSdkCommand(config, { dryRun: true });

    const calls = gitMock.mock.calls.map(([args]) => args.join(" "));

    expect(calls.some((c) => c.startsWith("commit"))).toBe(false);
    expect(calls).toContain("tag svc-auth-ts-client-v1.0.0");
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No content changes since last publish"),
    );
  });

  it("throws with the underlying stderr when a required git step fails", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir);
    gitMock.mockImplementation((args) => {
      if (args[0] === "worktree" && args[1] === "add") {
        return { status: 128, stdout: "", stderr: "fatal: no such ref" };
      }

      return defaultGitImpl(args);
    });

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [
            makeArtifact({
              id: "ts-client",
              outputDir,
              branch: "sdk/svc-auth/ts-client",
            }),
          ],
        }),
      ],
    });

    await expect(publishSdkCommand(config)).rejects.toThrow(
      /Failed to create worktree for sdk\/svc-auth\/ts-client: fatal: no such ref/,
    );
  });

  it("copies the artifact's generated output into the worktree before committing", async () => {
    const outputDir = path.join(dir, "auth", "ts-client");

    await prepareArtifactOutput(outputDir);

    let worktreeDirSeen: string | undefined;

    gitMock.mockImplementation((args, cwd) => {
      if (args[0] === "worktree" && args[1] === "add") {
        worktreeDirSeen = args.includes("--detach") ? args[3] : args[2];
      }

      return defaultGitImpl(args, cwd);
    });

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          artifacts: [makeArtifact({ id: "ts-client", outputDir })],
        }),
      ],
    });

    await publishSdkCommand(config, { dryRun: true });

    expect(worktreeDirSeen).toBeDefined();
    await expect(
      readFile(path.join(worktreeDirSeen!, "index.js"), "utf8"),
    ).resolves.toContain("module.exports");
  });

  it("processes multiple artifacts across contracts, logging a final summary count", async () => {
    const authDir = path.join(dir, "auth", "ts-client");
    const catalogDir = path.join(dir, "catalog", "ts-server");

    await prepareArtifactOutput(authDir);
    await prepareArtifactOutput(catalogDir);

    const config = makeConfig(dir, {
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [makeArtifact({ id: "ts-client", outputDir: authDir })],
        }),
        makeContract({
          name: "catalog",
          entrypoint: "/repo/specs/catalog/openapi.yaml",
          artifacts: [
            makeArtifact({
              id: "ts-server",
              tool: "openapi-typescript",
              outputDir: catalogDir,
            }),
          ],
        }),
      ],
    });

    await publishSdkCommand(config, { dryRun: true });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("processed 2 SDK packages"),
    );
  });
});
