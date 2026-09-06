import type { VarsTree } from "./schema";

export type { VarsTree } from "./schema";
export type SdkTool = "openapi-generator" | "openapi-typescript";
export type SdkLang = "typescript" | "go" | "java";
export type SdkKind = "client" | "server";

/**
 * Fully resolved publishing conventions for one artifact.
 */
export interface ResolvedPublishing {
  /** Fully resolved git branch name (no runtime-only placeholders left). */
  branch: string;
  /**
   * Raw tag template - still contains `{version}`, resolved at publish
   * time via `renderArtifactTag()` in `config/publishing.ts`.
   */
  tagTemplate: string;
  /** Resolved `repository.url` for generated package.json / README examples. */
  repositoryUrl: string;
  npmRegistry: string;
  npmAccess: "public" | "restricted";
  mavenRepositoryId: string;
  mavenRepositoryUrl: string;
}

/**
 * A single artifact a contract generates: a generator recipe from the CLI
 * config, fully resolved (templates interpolated, overrides merged, paths made
 * absolute) for one specific contract.
 */
export interface ResolvedArtifact {
  /**
   * The id this artifact is known by for this contract - the key under
   * `generators:` it was resolved from, or its `as` override. Used as the
   * output folder segment, and to derive the publish branch/tag.
   */
  id: string;

  tool: SdkTool;
  lang: SdkLang;
  kind: SdkKind;

  /** `openapi-generator -g` value. Set only when `tool` is `openapi-generator`. */
  generator?: string;

  /** Absolute output directory: `<sdkDir>/<contract>/<id>`. */
  outputDir: string;

  /**
   * Fully resolved git branch name - convenience alias for
   * `publishing.branch`.
   */
  branch: string;

  /**
   * Publishing conventions (branch/tag/registry) for this artifact - see
   * {@link ResolvedPublishing}.
   */
  publishing: ResolvedPublishing;

  additionalProperties: Record<string, string | number | boolean>;

  package?: string;
  goModule?: string;
  goPackageName?: string;
  maven?: { groupId: string; artifactId: string };

  /**
   * Absolute path to a custom README template, if `readme:` was set for this
   * generator/artifact. Falls back to a built-in default template when unset -
   * see `core/readme/readme-renderer.ts`.
   */
  readmeTemplate?: string;
}

export interface ResolvedContract {
  name: string;
  title: string;
  /** Absolute path to the source `openapi.yaml`. */
  entrypoint: string;
  /**
   * Path to the source `openapi.yaml`, relative to `rootDir` - what
   * `redocly.yaml`'s `apis:` section wants.
   */
  entrypointRelative: string;
  artifacts: ResolvedArtifact[];
}

/**
 * One (contract, artifact) pair - the flattened unit of work most commands
 * actually iterate over.
 */
export interface ResolvedArtifactEntry {
  contract: ResolvedContract;
  artifact: ResolvedArtifact;
}

export interface ResolvedConfig {
  /**
   * The config schema version this file targets - see `CONFIG_SCHEMA_VERSION`
   * in `config/schema.ts`.
   */
  configVersion: number;

  /**
   * Directory containing the config file - every relative path in the config
   * (entrypoints, `paths.*`, `readme` templates, ...) resolves against this.
   */
  rootDir: string;

  paths: {
    dist: string;
    specs: string;
    docs: string;
    sdk: string;
  };

  github: { owner: string; repo: string };
  vars: VarsTree;

  docs: {
    server: { host: string; port: number };
    metadata: {
      title: string;
      description: string;
      favicon: string;
      baseServerUrl: string;
    };
  };

  contracts: ResolvedContract[];

  /**
   * Every (contract, artifact) pair across every contract, in config order -
   * the flat list most commands iterate over.
   */
  allArtifacts: ResolvedArtifactEntry[];
}
