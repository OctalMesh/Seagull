import { describe, expect, it } from "vitest";

import {
  CONFIG_SCHEMA_VERSION,
  artifactRefSchema,
  contractSchema,
  generatorDefSchema,
  publishingSchema,
  rootConfigSchema,
  varsTreeSchema,
} from "./schema";

const validPublishing = {
  branch: "sdk/svc-{service}/{id}",
  tag: "svc-{service}-{id}-v{version}",
  repositoryUrl: "https://github.com/{github.owner}/{github.repo}",
  npm: { registry: "https://npm.pkg.github.com", access: "public" as const },
  maven: {
    repositoryId: "github",
    repositoryUrl: "https://maven.pkg.github.com/{github.owner}/{github.repo}",
  },
};

const minimalRootConfig = {
  configVersion: 1,
  github: { owner: "OctalMesh", repo: "ows-contracts" },
  docs: {
    server: { host: "localhost", port: 8080 },
    metadata: {
      title: "t",
      description: "d",
      favicon: "f",
      baseServerUrl: "https://example.com",
    },
  },
  publishing: validPublishing,
  generators: {
    "ts-server": {
      tool: "openapi-typescript",
      lang: "typescript",
      kind: "server",
      package: "@org/{service}-server",
      additionalProperties: {},
    },
  },
  contracts: [
    {
      name: "auth",
      title: "Auth Service API",
      entrypoint: "specs/auth/openapi.yaml",
      artifacts: ["ts-server"],
    },
  ],
};

describe("varsTreeSchema", () => {
  it("accepts a free-form nested tree of string/number/boolean leaves", () => {
    const result = varsTreeSchema.safeParse({
      org: "octalmesh",
      port: 8080,
      enabled: true,
      nested: { deep: { deeper: "value" } },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a leaf of an unsupported type", () => {
    const result = varsTreeSchema.safeParse({ bad: null });

    expect(result.success).toBe(false);
  });

  it("accepts an empty tree", () => {
    expect(varsTreeSchema.safeParse({}).success).toBe(true);
  });
});

describe("generatorDefSchema", () => {
  const base = {
    tool: "openapi-generator" as const,
    lang: "typescript" as const,
    kind: "client" as const,
    generator: "typescript-fetch",
    package: "@org/pkg",
    additionalProperties: {},
  };

  it("accepts a minimal valid typescript openapi-generator recipe", () => {
    expect(generatorDefSchema.safeParse(base).success).toBe(true);
  });

  it("requires 'generator' when tool is 'openapi-generator'", () => {
    const rest: Record<string, unknown> = { ...base };

    delete rest.generator;
    const result = generatorDefSchema.safeParse(rest);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(
        /"generator" is required when tool is "openapi-generator"/,
      );
    }
  });

  it("does not require 'generator' when tool is 'openapi-typescript'", () => {
    const result = generatorDefSchema.safeParse({
      tool: "openapi-typescript",
      lang: "typescript",
      kind: "server",
      package: "@org/pkg",
      additionalProperties: {},
    });

    expect(result.success).toBe(true);
  });

  it("requires 'goModule' for lang 'go'", () => {
    const result = generatorDefSchema.safeParse({
      ...base,
      lang: "go",
      generator: "go",
      goPackageName: "authclient",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes('"goModule" is required for lang "go"'),
        ),
      ).toBe(true);
    }
  });

  it("accepts lang 'go' when goModule is present", () => {
    const result = generatorDefSchema.safeParse({
      ...base,
      lang: "go",
      generator: "go",
      package: undefined,
      goModule: "github.com/org/repo",
      goPackageName: "authclient",
    });

    expect(result.success).toBe(true);
  });

  it("requires 'maven' ({groupId, artifactId}) for lang 'java'", () => {
    const result = generatorDefSchema.safeParse({
      ...base,
      lang: "java",
      generator: "java",
      package: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes('"maven"')),
      ).toBe(true);
    }
  });

  it("accepts lang 'java' when maven coordinates are present", () => {
    const result = generatorDefSchema.safeParse({
      ...base,
      lang: "java",
      generator: "java",
      package: undefined,
      maven: { groupId: "com.org.svc", artifactId: "svc-client" },
    });

    expect(result.success).toBe(true);
  });

  it("requires 'package' for lang 'typescript'", () => {
    const result = generatorDefSchema.safeParse({
      ...base,
      package: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes('"package" is required for lang "typescript"'),
        ),
      ).toBe(true);
    }
  });

  it("can report multiple independent cross-field issues at once", () => {
    const result = generatorDefSchema.safeParse({
      tool: "openapi-generator",
      lang: "go",
      kind: "client",
      additionalProperties: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("defaults additionalProperties to an empty object when omitted", () => {
    const result = generatorDefSchema.safeParse({
      tool: "openapi-typescript",
      lang: "typescript",
      kind: "server",
      package: "@org/pkg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.additionalProperties).toEqual({});
    }
  });

  it("rejects an empty-string 'generator' as if absent", () => {
    const result = generatorDefSchema.safeParse({ ...base, generator: "" });

    expect(result.success).toBe(false);
  });
});

describe("artifactRefSchema", () => {
  it("accepts a plain string id", () => {
    expect(artifactRefSchema.safeParse("ts-client").success).toBe(true);
  });

  it("rejects an empty string id", () => {
    expect(artifactRefSchema.safeParse("").success).toBe(false);
  });

  it("accepts the object form with generator/as/overrides", () => {
    const result = artifactRefSchema.safeParse({
      generator: "ts-client",
      as: "ts-client-legacy",
      overrides: { package: "@org/legacy-{service}" },
    });

    expect(result.success).toBe(true);
  });

  it("accepts the object form with only 'generator' set", () => {
    expect(
      artifactRefSchema.safeParse({ generator: "ts-client" }).success,
    ).toBe(true);
  });

  it("rejects an object form missing 'generator'", () => {
    expect(artifactRefSchema.safeParse({ as: "x" }).success).toBe(false);
  });

  it("allows overrides to be a partial generator def missing required fields", () => {
    const result = artifactRefSchema.safeParse({
      generator: "java-client",
      overrides: { additionalProperties: { library: "restclient" } },
    });

    expect(result.success).toBe(true);
  });
});

describe("contractSchema", () => {
  it("requires at least one artifact", () => {
    const result = contractSchema.safeParse({
      name: "auth",
      title: "Auth",
      entrypoint: "specs/auth/openapi.yaml",
      artifacts: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a contract with mixed string and object artifact refs", () => {
    const result = contractSchema.safeParse({
      name: "auth",
      title: "Auth",
      entrypoint: "specs/auth/openapi.yaml",
      artifacts: ["ts-client", { generator: "java-client", as: "java-v2" }],
    });

    expect(result.success).toBe(true);
  });
});

describe("publishingSchema", () => {
  it("accepts a fully specified publishing block", () => {
    expect(publishingSchema.safeParse(validPublishing).success).toBe(true);
  });

  it("rejects a publishing block missing 'maven'", () => {
    const rest: Record<string, unknown> = { ...validPublishing };

    delete rest.maven;

    expect(publishingSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an npm.access value outside the enum", () => {
    const result = publishingSchema.safeParse({
      ...validPublishing,
      npm: { ...validPublishing.npm, access: "private" },
    });

    expect(result.success).toBe(false);
  });
});

describe("rootConfigSchema", () => {
  it("accepts a minimal valid config", () => {
    const result = rootConfigSchema.safeParse(minimalRootConfig);

    expect(result.success).toBe(true);
  });

  it("defaults 'vars' to an empty object", () => {
    const result = rootConfigSchema.safeParse(minimalRootConfig);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vars).toEqual({});
    }
  });

  it("defaults 'paths' to { dist: 'dist' }", () => {
    const result = rootConfigSchema.safeParse(minimalRootConfig);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paths).toEqual({ dist: "dist" });
    }
  });

  it("only accepts configVersion === CONFIG_SCHEMA_VERSION", () => {
    expect(CONFIG_SCHEMA_VERSION).toBe(1);

    const result = rootConfigSchema.safeParse({
      ...minimalRootConfig,
      configVersion: 2,
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one contract", () => {
    const result = rootConfigSchema.safeParse({
      ...minimalRootConfig,
      contracts: [],
    });

    expect(result.success).toBe(false);
  });

  it("requires the root 'publishing' block", () => {
    const rest: Record<string, unknown> = { ...minimalRootConfig };

    delete rest.publishing;
    const result = rootConfigSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("rejects a contract referencing artifacts by any shape but keeps generators as a free map", () => {
    const result = rootConfigSchema.safeParse({
      ...minimalRootConfig,
      generators: {
        ...minimalRootConfig.generators,
        "another-one": {
          tool: "openapi-typescript",
          lang: "typescript",
          kind: "server",
          package: "@org/other-{service}",
          additionalProperties: {},
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts explicit paths overrides", () => {
    const result = rootConfigSchema.safeParse({
      ...minimalRootConfig,
      paths: { dist: "build", specs: "specs-out", docs: "docs-out" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paths).toEqual({
        dist: "build",
        specs: "specs-out",
        docs: "docs-out",
      });
    }
  });

  it("rejects a config missing docs metadata", () => {
    const rest: Record<string, unknown> = { ...minimalRootConfig };

    delete rest.docs;

    expect(rootConfigSchema.safeParse(rest).success).toBe(false);
  });
});
