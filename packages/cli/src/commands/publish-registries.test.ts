import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import {
  makeArtifact,
  makeConfig,
  makeContract,
} from "../test-support/fixtures";

const runMock = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("@octalmesh/seagull-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@octalmesh/seagull-core")>();

  return { ...actual, run: (...a: unknown[]) => runMock(...a) };
});

const { publishRegistriesCommand } = await import("./publish-registries");

describe("publishRegistriesCommand", () => {
  let logSpy: MockInstance;

  beforeEach(() => {
    runMock.mockClear();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("npm-publishes each typescript artifact from its outputDir", async () => {
    const outputDir = "/tmp/dist/sdk/auth/ts-client";
    const config = makeConfig("/repo", {
      contracts: [
        makeContract({
          artifacts: [
            makeArtifact({ id: "ts-client", lang: "typescript", outputDir }),
          ],
        }),
      ],
    });

    await publishRegistriesCommand(config);

    expect(runMock).toHaveBeenCalledWith("npm", ["publish"], outputDir);
  });

  it("mvn-deploys each java artifact from its outputDir", async () => {
    const outputDir = "/tmp/dist/sdk/auth/java-client";
    const config = makeConfig("/repo", {
      contracts: [
        makeContract({
          artifacts: [
            makeArtifact({
              id: "java-client",
              lang: "java",
              package: undefined,
              maven: {
                groupId: "com.octalmesh.auth",
                artifactId: "auth-client",
              },
              outputDir,
            }),
          ],
        }),
      ],
    });

    await publishRegistriesCommand(config);

    expect(runMock).toHaveBeenCalledWith(
      "mvn",
      ["-B", "deploy", "-DskipTests"],
      outputDir,
    );
  });

  it("skips go artifacts entirely (no registry step)", async () => {
    const config = makeConfig("/repo", {
      contracts: [
        makeContract({
          artifacts: [
            makeArtifact({
              id: "go-client",
              lang: "go",
              package: undefined,
              goModule: "github.com/octalmesh/ows-contracts",
              goPackageName: "authclient",
            }),
          ],
        }),
      ],
    });

    await publishRegistriesCommand(config);

    expect(runMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("published 0 registry package(s)"),
    );
  });

  it("in dry-run mode, logs the command it would run but never calls run()", async () => {
    const outputDir = "/tmp/dist/sdk/auth/ts-client";
    const config = makeConfig("/repo", {
      contracts: [
        makeContract({
          artifacts: [
            makeArtifact({ id: "ts-client", lang: "typescript", outputDir }),
          ],
        }),
      ],
    });

    await publishRegistriesCommand(config, { dryRun: true });

    expect(runMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`$ npm publish  (in ${outputDir})`),
    );
  });

  it("counts and publishes both a typescript and a java artifact within the same run", async () => {
    const config = makeConfig("/repo", {
      contracts: [
        makeContract({
          name: "auth",
          artifacts: [
            makeArtifact({
              id: "ts-client",
              lang: "typescript",
              outputDir: "/a",
            }),
          ],
        }),
        makeContract({
          name: "catalog",
          artifacts: [
            makeArtifact({
              id: "java-client",
              lang: "java",
              package: undefined,
              maven: { groupId: "g", artifactId: "a" },
              outputDir: "/b",
            }),
          ],
        }),
      ],
    });

    await publishRegistriesCommand(config);

    expect(runMock).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("published 2 registry package(s)"),
    );
  });
});
