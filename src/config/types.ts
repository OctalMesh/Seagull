import type { VarsTree } from "./schema";

export type { VarsTree } from "./schema";
export type SdkTool = "openapi-generator" | "openapi-typescript";
export type SdkLang = "typescript" | "go" | "java";
export type SdkKind = "client" | "server";

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

  /** `sdk/svc-<contract>/<id>` */
  branch: string;
  /** `svc-<contract>-<id>` */
  tagPrefix: string;

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
