import path from "node:path";

import type {
  ResolvedArtifact,
  ResolvedArtifactEntry,
  ResolvedConfig,
  ResolvedContract,
  ResolvedPublishing,
} from "@octalmesh/seagull-core";

export function makePublishing(
  overrides: Partial<ResolvedPublishing> = {},
): ResolvedPublishing {
  return {
    branch: "sdk/svc-auth/ts-client",
    tagTemplate: "svc-{service}-{id}-v{version}",
    repositoryUrl: "https://github.com/OctalMesh/ows-contracts",
    npmRegistry: "https://npm.pkg.github.com",
    npmAccess: "public",
    mavenRepositoryId: "github",
    mavenRepositoryUrl: "https://maven.pkg.github.com/OctalMesh/ows-contracts",
    ...overrides,
  };
}

export function makeArtifact(
  overrides: Partial<ResolvedArtifact> = {},
): ResolvedArtifact {
  return {
    id: "ts-client",
    tool: "openapi-generator",
    lang: "typescript",
    kind: "client",
    generator: "typescript-fetch",
    outputDir: "/tmp/dist/sdk/auth/ts-client",
    branch: "sdk/svc-auth/ts-client",
    publishing: makePublishing(),
    additionalProperties: {},
    package: "@octalmesh/auth-client",
    ...overrides,
  };
}

export function makeContract(
  overrides: Partial<ResolvedContract> = {},
): ResolvedContract {
  return {
    name: "auth",
    title: "Auth Service API",
    entrypoint: "/repo/specs/auth/openapi.yaml",
    entrypointRelative: path.join("specs", "auth", "openapi.yaml"),
    artifacts: [makeArtifact()],
    ...overrides,
  };
}

export const GITHUB = { owner: "OctalMesh", repo: "ows-contracts" };

export function makeConfig(
  rootDir: string,
  overrides: Partial<ResolvedConfig> = {},
): ResolvedConfig {
  const dist = path.join(rootDir, "dist");
  const contracts = overrides.contracts ?? [makeContract()];

  return {
    configVersion: 1,
    rootDir,
    paths: {
      dist,
      specs: path.join(dist, "specs"),
      docs: path.join(dist, "docs"),
      sdk: path.join(dist, "sdk"),
    },
    github: GITHUB,
    vars: {},
    docs: {
      server: { host: "localhost", port: 8080 },
      metadata: {
        title: "t",
        description: "d",
        favicon: "f",
        baseServerUrl: "https://example.com",
      },
    },
    contracts,
    allArtifacts: contracts.flatMap((contract) =>
      contract.artifacts.map((artifact): ResolvedArtifactEntry => ({
        contract,
        artifact,
      })),
    ),
    ...overrides,
  };
}
