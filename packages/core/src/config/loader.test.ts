import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stringify as stringifyYaml } from "yaml";

import { loadConfig } from "./loader";

function baseConfig(): Record<string, unknown> {
  return {
    configVersion: 1,
    github: { owner: "OctalMesh", repo: "ows-contracts" },
    vars: { org: "octalmesh", platform: "web" },
    paths: { dist: "dist" },
    docs: {
      server: { host: "localhost", port: 8080 },
      metadata: {
        title: "OWS Docs",
        description: "desc",
        favicon: "fav.ico",
        baseServerUrl: "https://octalmesh.com",
      },
    },
    publishing: {
      branch: "sdk/svc-{service}/{id}",
      tag: "svc-{service}-{id}-v{version}",
      repositoryUrl: "https://github.com/{github.owner}/{github.repo}",
      npm: { registry: "https://npm.pkg.github.com", access: "public" },
      maven: {
        repositoryId: "github",
        repositoryUrl:
          "https://maven.pkg.github.com/{github.owner}/{github.repo}",
      },
    },
    generators: {
      "ts-client": {
        tool: "openapi-generator",
        generator: "typescript-fetch",
        lang: "typescript",
        kind: "client",
        package: "@{vars.org}/{service}-client",
        additionalProperties: { supportsES6: true },
      },
      "ts-server": {
        tool: "openapi-typescript",
        lang: "typescript",
        kind: "server",
        package: "@{vars.org}/{service}-server",
      },
      "java-client": {
        tool: "openapi-generator",
        generator: "java",
        lang: "java",
        kind: "client",
        maven: {
          groupId: "com.{vars.org}.{service}",
          artifactId: "{service}-client",
        },
      },
    },
    contracts: [
      {
        name: "auth",
        title: "Auth Service API",
        entrypoint: "specs/auth/openapi.yaml",
        artifacts: ["ts-client", "ts-server"],
      },
      {
        name: "catalog",
        title: "Catalog Service API",
        entrypoint: "specs/catalog/openapi.yaml",
        artifacts: [
          {
            generator: "ts-client",
            as: "ts-client-legacy",
            overrides: {
              package: "@{vars.org}/{service}-client-legacy",
              additionalProperties: { legacy: true },
            },
          },
        ],
      },
    ],
  };
}

describe("loadConfig", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-loader-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeConfig(
    config: Record<string, unknown>,
    filename = "seagull.yaml",
  ): Promise<string> {
    const configPath = path.join(dir, filename);

    await writeFile(configPath, stringifyYaml(config));

    return configPath;
  }

  it("throws a readable, multi-issue error for an invalid config", async () => {
    const configPath = await writeConfig({ configVersion: 1 });

    expect(() => loadConfig(configPath)).toThrow(/Invalid seagull\.yaml/);
  });

  it("loads a minimal valid config and resolves every top-level field", async () => {
    const configPath = await writeConfig(baseConfig());
    const config = loadConfig(configPath);

    expect(config.configVersion).toBe(1);
    expect(config.rootDir).toBe(dir);
    expect(config.github).toEqual({
      owner: "OctalMesh",
      repo: "ows-contracts",
    });
    expect(config.vars).toEqual({ org: "octalmesh", platform: "web" });
    expect(config.paths.dist).toBe(path.join(dir, "dist"));
    expect(config.paths.specs).toBe(path.join(dir, "dist", "specs"));
    expect(config.paths.docs).toBe(path.join(dir, "dist", "docs"));
    expect(config.paths.sdk).toBe(path.join(dir, "dist", "sdk"));
    expect(config.contracts).toHaveLength(2);
    expect(config.allArtifacts).toHaveLength(3);
  });

  it("respects explicit paths.specs/docs/sdk overrides instead of dist-relative defaults", async () => {
    const cfg = baseConfig();

    (cfg.paths as Record<string, unknown>) = {
      dist: "dist",
      specs: "custom-specs",
      docs: "custom-docs",
      sdk: "custom-sdk",
    };

    const configPath = await writeConfig(cfg);
    const config = loadConfig(configPath);

    expect(config.paths.specs).toBe(path.join(dir, "custom-specs"));
    expect(config.paths.docs).toBe(path.join(dir, "custom-docs"));
    expect(config.paths.sdk).toBe(path.join(dir, "custom-sdk"));
  });

  it("resolves each contract's entrypoint to an absolute path, and a rootDir-relative one", async () => {
    const configPath = await writeConfig(baseConfig());
    const config = loadConfig(configPath);

    const auth = config.contracts.find((c) => c.name === "auth")!;

    expect(auth.entrypoint).toBe(path.join(dir, "specs/auth/openapi.yaml"));
    expect(auth.entrypointRelative).toBe(
      path.join("specs", "auth", "openapi.yaml"),
    );
  });

  it("interpolates templated fields on every artifact (package, additionalProperties)", async () => {
    const configPath = await writeConfig(baseConfig());
    const config = loadConfig(configPath);

    const auth = config.contracts.find((c) => c.name === "auth")!;
    const tsClient = auth.artifacts.find((a) => a.id === "ts-client")!;

    expect(tsClient.package).toBe("@octalmesh/auth-client");
    expect(tsClient.additionalProperties).toEqual({ supportsES6: true });
  });

  it("computes each artifact's outputDir as <sdkDir>/<contract>/<id>", async () => {
    const configPath = await writeConfig(baseConfig());
    const config = loadConfig(configPath);

    const auth = config.contracts.find((c) => c.name === "auth")!;
    const tsServer = auth.artifacts.find((a) => a.id === "ts-server")!;

    expect(tsServer.outputDir).toBe(
      path.join(dir, "dist", "sdk", "auth", "ts-server"),
    );
  });

  it("resolves the root-level publishing block per artifact, interpolating branch/repositoryUrl/registries but not the tag template", async () => {
    const configPath = await writeConfig(baseConfig());
    const config = loadConfig(configPath);

    const auth = config.contracts.find((c) => c.name === "auth")!;
    const tsClient = auth.artifacts.find((a) => a.id === "ts-client")!;

    expect(tsClient.branch).toBe("sdk/svc-auth/ts-client");
    expect(tsClient.publishing.branch).toBe("sdk/svc-auth/ts-client");
    expect(tsClient.publishing.repositoryUrl).toBe(
      "https://github.com/OctalMesh/ows-contracts",
    );
    expect(tsClient.publishing.npmRegistry).toBe("https://npm.pkg.github.com");
    expect(tsClient.publishing.npmAccess).toBe("public");
    expect(tsClient.publishing.mavenRepositoryId).toBe("github");
    expect(tsClient.publishing.tagTemplate).toBe(
      "svc-{service}-{id}-v{version}",
    );
  });

  it("applies an artifact-ref's 'as' to rename the artifact id (and its branch/outputDir)", async () => {
    const configPath = await writeConfig(baseConfig());
    const config = loadConfig(configPath);

    const catalog = config.contracts.find((c) => c.name === "catalog")!;

    expect(catalog.artifacts).toHaveLength(1);
    expect(catalog.artifacts[0]!.id).toBe("ts-client-legacy");
    expect(catalog.artifacts[0]!.branch).toBe(
      "sdk/svc-catalog/ts-client-legacy",
    );
    expect(catalog.artifacts[0]!.outputDir).toBe(
      path.join(dir, "dist", "sdk", "catalog", "ts-client-legacy"),
    );
  });

  it("merges an artifact-ref's overrides onto the base generator (own fields win)", async () => {
    const configPath = await writeConfig(baseConfig());
    const config = loadConfig(configPath);

    const catalog = config.contracts.find((c) => c.name === "catalog")!;
    const legacy = catalog.artifacts[0]!;

    expect(legacy.package).toBe("@octalmesh/catalog-client-legacy");
    expect(legacy.additionalProperties).toEqual({
      supportsES6: true,
      legacy: true,
    });
  });

  it("throws a descriptive error when a contract references an unknown generator id", async () => {
    const cfg = baseConfig();

    (cfg.contracts as Record<string, unknown>[])[0]!.artifacts = [
      "does-not-exist",
    ];

    const configPath = await writeConfig(cfg);

    expect(() => loadConfig(configPath)).toThrow(
      /Contract "auth" references unknown generator "does-not-exist" \(available: java-client, ts-client, ts-server\)/,
    );
  });

  it("throws when a template placeholder can't be resolved", async () => {
    const cfg = baseConfig();

    (cfg.generators as Record<string, Record<string, unknown>>)[
      "ts-client"
    ]!.package = "@{vars.missing}/{service}-client";

    const configPath = await writeConfig(cfg);

    expect(() => loadConfig(configPath)).toThrow(
      /Unknown template placeholder "\{vars\.missing\}"/,
    );
  });

  describe("publishing overrides", () => {
    it("lets a generator-level 'publishing' override win over the root block", async () => {
      const cfg = baseConfig();

      (cfg.generators as Record<string, Record<string, unknown>>)[
        "ts-client"
      ]!.publishing = {
        npm: { registry: "https://registry.internal.example.com" },
      };

      const configPath = await writeConfig(cfg);
      const config = loadConfig(configPath);

      const auth = config.contracts.find((c) => c.name === "auth")!;
      const tsClient = auth.artifacts.find((a) => a.id === "ts-client")!;
      const tsServer = auth.artifacts.find((a) => a.id === "ts-server")!;

      expect(tsClient.publishing.npmRegistry).toBe(
        "https://registry.internal.example.com",
      );
      expect(tsClient.publishing.npmAccess).toBe("public");
      expect(tsServer.publishing.npmRegistry).toBe(
        "https://npm.pkg.github.com",
      );
    });

    it("lets an artifact-ref override's 'publishing' win over both the generator's and the root's", async () => {
      const cfg = baseConfig();

      (cfg.generators as Record<string, Record<string, unknown>>)[
        "ts-client"
      ]!.publishing = { branch: "generator-level/{service}/{id}" };

      (cfg.contracts as Record<string, unknown>[])[1]!.artifacts = [
        {
          generator: "ts-client",
          overrides: {
            publishing: { branch: "artifact-level/{service}/{id}" },
          },
        },
      ];

      const configPath = await writeConfig(cfg);
      const config = loadConfig(configPath);

      const catalog = config.contracts.find((c) => c.name === "catalog")!;

      expect(catalog.artifacts[0]!.branch).toBe(
        "artifact-level/catalog/ts-client",
      );
    });

    it("deep-merges 'maven' when an artifact-ref override's own 'maven' partially overlaps the generator's", async () => {
      const cfg = baseConfig();

      (cfg.contracts as Record<string, unknown>[])[1]!.artifacts = [
        {
          generator: "java-client",
          overrides: {
            maven: {
              groupId: "com.{vars.org}.{service}",
              artifactId: "{service}-client-v2",
            },
          },
        },
      ];

      const configPath = await writeConfig(cfg);
      const config = loadConfig(configPath);

      const catalog = config.contracts.find((c) => c.name === "catalog")!;

      expect(catalog.artifacts[0]!.maven).toEqual({
        groupId: "com.octalmesh.catalog",
        artifactId: "catalog-client-v2",
      });
    });

    it("deep-merges 'npm' and 'maven' when both a generator-level and an artifact-level publishing override set them", async () => {
      const cfg = baseConfig();

      (cfg.generators as Record<string, Record<string, unknown>>)[
        "ts-client"
      ]!.publishing = {
        npm: {
          registry: "https://generator-level.example.com",
          access: "public",
        },
      };

      (cfg.contracts as Record<string, unknown>[])[1]!.artifacts = [
        {
          generator: "ts-client",
          overrides: {
            publishing: { npm: { access: "restricted" } },
          },
        },
      ];

      const configPath = await writeConfig(cfg);
      const config = loadConfig(configPath);

      const catalog = config.contracts.find((c) => c.name === "catalog")!;

      expect(catalog.artifacts[0]!.publishing.npmRegistry).toBe(
        "https://generator-level.example.com",
      );
      expect(catalog.artifacts[0]!.publishing.npmAccess).toBe("restricted");
    });

    it("deep-merges 'maven' in a publishing override on top of the root's maven repository config", async () => {
      const cfg = baseConfig();

      (cfg.contracts as Record<string, unknown>[])[1]!.artifacts = [
        {
          generator: "ts-client",
          overrides: {
            publishing: { maven: { repositoryId: "internal" } },
          },
        },
      ];

      const configPath = await writeConfig(cfg);
      const config = loadConfig(configPath);

      const catalog = config.contracts.find((c) => c.name === "catalog")!;

      expect(catalog.artifacts[0]!.publishing.mavenRepositoryId).toBe(
        "internal",
      );
      expect(catalog.artifacts[0]!.publishing.mavenRepositoryUrl).toBe(
        "https://maven.pkg.github.com/OctalMesh/ows-contracts",
      );
    });
  });

  describe("readme templates", () => {
    it("resolves 'readme' relative to the config's rootDir when set", async () => {
      const cfg = baseConfig();

      (cfg.generators as Record<string, Record<string, unknown>>)[
        "ts-client"
      ]!.readme = "readme-templates/ts-client.md";

      const configPath = await writeConfig(cfg);
      const config = loadConfig(configPath);

      const auth = config.contracts.find((c) => c.name === "auth")!;
      const tsClient = auth.artifacts.find((a) => a.id === "ts-client")!;

      expect(tsClient.readmeTemplate).toBe(
        path.join(dir, "readme-templates/ts-client.md"),
      );
    });

    it("leaves readmeTemplate undefined when no 'readme' is configured", async () => {
      const configPath = await writeConfig(baseConfig());
      const config = loadConfig(configPath);

      const auth = config.contracts.find((c) => c.name === "auth")!;
      const tsServer = auth.artifacts.find((a) => a.id === "ts-server")!;

      expect(tsServer.readmeTemplate).toBeUndefined();
    });
  });

  describe("allArtifacts", () => {
    it("flattens every (contract, artifact) pair across all contracts, in config order", async () => {
      const configPath = await writeConfig(baseConfig());
      const config = loadConfig(configPath);

      expect(
        config.allArtifacts.map((e) => `${e.contract.name}/${e.artifact.id}`),
      ).toEqual([
        "auth/ts-client",
        "auth/ts-server",
        "catalog/ts-client-legacy",
      ]);

      for (const entry of config.allArtifacts) {
        expect(entry.contract).toBe(
          config.contracts.find((c) => c.name === entry.contract.name),
        );
      }
    });
  });

  describe("config file discovery filenames", () => {
    it("loads correctly regardless of which recognized filename is used", async () => {
      await mkdir(dir, { recursive: true });
      const configPath = await writeConfig(baseConfig(), ".seagull.yaml");
      const config = loadConfig(configPath);

      expect(config.contracts).toHaveLength(2);
    });
  });
});
