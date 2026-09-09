import type {
  ResolvedArtifact,
  ResolvedContract,
  ResolvedPublishing,
} from "../config/types";

/**
 * Builds a {@link ResolvedPublishing} fixture with sensible defaults,
 * overridable per-field - used across generator/readme/patcher tests so each
 * test only has to spell out the fields it actually cares about.
 */
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

/**
 * Builds a {@link ResolvedArtifact} fixture, defaulting to a TypeScript
 * client artifact - overridable per-field for other lang/kind/tool
 * combinations.
 */
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

/**
 * Builds a {@link ResolvedContract} fixture containing a single artifact by
 * default.
 */
export function makeContract(
  overrides: Partial<ResolvedContract> = {},
): ResolvedContract {
  return {
    name: "auth",
    title: "Auth Service API",
    entrypoint: "/repo/specs/auth/openapi.yaml",
    entrypointRelative: "specs/auth/openapi.yaml",
    artifacts: [makeArtifact()],
    ...overrides,
  };
}

export const GITHUB = { owner: "OctalMesh", repo: "ows-contracts" };
