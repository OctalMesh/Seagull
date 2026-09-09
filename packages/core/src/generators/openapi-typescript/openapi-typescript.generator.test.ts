import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GenerateContext, PrepareContext } from "../../generator/types";
import {
  GITHUB,
  makeArtifact,
  makeContract,
} from "../../test-support/fixtures";

const runMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const resolveBinPathMock = vi.fn(
  (..._args: unknown[]) => "/fake/bin/openapi-typescript.js",
);

vi.mock("../../process/exec", () => ({
  run: (...a: unknown[]) => runMock(...a),
}));
vi.mock("../../process/resolve-bin", () => ({
  resolveBinPath: (...a: unknown[]) => resolveBinPathMock(...a),
}));

const { OpenApiTypescriptGenerator } =
  await import("./openapi-typescript.generator");

describe("OpenApiTypescriptGenerator", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-oats-"));
    runMock.mockClear();
    resolveBinPathMock.mockClear();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("exposes 'tool' as \"openapi-typescript\"", () => {
    expect(new OpenApiTypescriptGenerator().tool).toBe("openapi-typescript");
  });

  describe("prepare", () => {
    it("creates every entry's output directory", async () => {
      const outA = path.join(dir, "auth", "ts-server");
      const outB = path.join(dir, "catalog", "ts-server");

      const ctx: PrepareContext = {
        rootDir: dir,
        entries: [
          {
            contract: makeContract(),
            artifact: makeArtifact({ outputDir: outA }),
          },
          {
            contract: makeContract({ name: "catalog" }),
            artifact: makeArtifact({ outputDir: outB }),
          },
        ],
      };

      await new OpenApiTypescriptGenerator().prepare(ctx);

      await expect(stat(outA)).resolves.toMatchObject({});
      await expect(stat(outB)).resolves.toMatchObject({});
    });

    it("resolves the openapi-typescript bin and runs it once, in rootDir, with no extra args", async () => {
      const ctx: PrepareContext = { rootDir: dir, entries: [] };

      await new OpenApiTypescriptGenerator().prepare(ctx);

      expect(resolveBinPathMock).toHaveBeenCalledWith(
        "openapi-typescript",
        "openapi-typescript",
      );
      expect(runMock).toHaveBeenCalledWith(
        "node",
        ["/fake/bin/openapi-typescript.js"],
        dir,
      );
      expect(runMock).toHaveBeenCalledOnce();
    });
  });

  describe("generate", () => {
    function makeCtx(
      overrides: Partial<GenerateContext> = {},
    ): GenerateContext {
      return {
        rootDir: dir,
        contract: makeContract(),
        artifact: makeArtifact({
          tool: "openapi-typescript",
          lang: "typescript",
          kind: "server",
          outputDir: dir,
          package: "@octalmesh/auth-server",
        }),
        version: "1.0.0",
        github: GITHUB,
        specInputPath: "/repo/dist/specs/auth.json",
        ...overrides,
      };
    }

    it("writes a package.json with name/version/description/types/files/license", async () => {
      await new OpenApiTypescriptGenerator().generate(
        makeCtx({ version: "1.4.0" }),
      );

      const pkg = JSON.parse(
        await readFile(path.join(dir, "package.json"), "utf8"),
      ) as Record<string, unknown>;

      expect(pkg).toMatchObject({
        name: "@octalmesh/auth-server",
        version: "1.4.0",
        description: "Types-only OpenAPI contract for the auth service.",
        types: "./index.d.ts",
        files: ["index.d.ts"],
        license: "MIT",
      });
    });

    it("writes 'repository' as git+<repositoryUrl>.git", async () => {
      await new OpenApiTypescriptGenerator().generate(
        makeCtx({
          artifact: makeArtifact({
            outputDir: dir,
            package: "@octalmesh/auth-server",
            publishing: {
              branch: "sdk/svc-auth/ts-server",
              tagTemplate: "svc-{service}-{id}-v{version}",
              repositoryUrl: "https://github.com/OctalMesh/ows-contracts",
              npmRegistry: "https://npm.pkg.github.com",
              npmAccess: "public",
              mavenRepositoryId: "github",
              mavenRepositoryUrl:
                "https://maven.pkg.github.com/OctalMesh/ows-contracts",
            },
          }),
        }),
      );

      const pkg = JSON.parse(
        await readFile(path.join(dir, "package.json"), "utf8"),
      ) as Record<string, unknown>;

      expect(pkg.repository).toEqual({
        type: "git",
        url: "git+https://github.com/OctalMesh/ows-contracts.git",
      });
    });

    it("writes 'publishConfig' from artifact.publishing.npmRegistry/npmAccess", async () => {
      await new OpenApiTypescriptGenerator().generate(
        makeCtx({
          artifact: makeArtifact({
            outputDir: dir,
            package: "@octalmesh/auth-server",
            publishing: {
              branch: "sdk/svc-auth/ts-server",
              tagTemplate: "svc-{service}-{id}-v{version}",
              repositoryUrl: "https://github.com/OctalMesh/ows-contracts",
              npmRegistry: "https://custom.example.com",
              npmAccess: "restricted",
              mavenRepositoryId: "github",
              mavenRepositoryUrl:
                "https://maven.pkg.github.com/OctalMesh/ows-contracts",
            },
          }),
        }),
      );

      const pkg = JSON.parse(
        await readFile(path.join(dir, "package.json"), "utf8"),
      ) as Record<string, unknown>;

      expect(pkg.publishConfig).toEqual({
        registry: "https://custom.example.com",
        access: "restricted",
      });
    });

    it("does not invoke the openapi-typescript binary itself (that only happens in prepare)", async () => {
      await new OpenApiTypescriptGenerator().generate(makeCtx());

      expect(runMock).not.toHaveBeenCalled();
    });
  });
});
