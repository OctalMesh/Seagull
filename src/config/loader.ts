import { readFileSync } from "node:fs";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { z } from "zod";

import {
  type ArtifactRefInput,
  type ContractInput,
  type GeneratorDefInput,
  type RootConfigInput,
  rootConfigSchema,
} from "./schema";
import { buildTemplateContext, interpolateDeep } from "./template";
import type {
  ResolvedArtifact,
  ResolvedConfig,
  ResolvedContract,
} from "./types";

/**
 * Reads and validates a CLI config file, throwing a readable, multi-issue error
 * message if it doesn't match the schema.
 *
 * @param configPath - Absolute path to the YAML config file.
 * @returns The validated (but not yet resolved) raw config.
 */
function readRawConfig(configPath: string): RootConfigInput {
  const raw = parseYaml(readFileSync(configPath, "utf8"));
  const result = rootConfigSchema.safeParse(raw);

  if (!result.success) {
    const issues = z.prettifyError(result.error);

    throw new Error(`Invalid ${path.basename(configPath)}:\n${issues}`);
  }

  return result.data;
}

/**
 * Deep-merges a generator override (from an artifact's `overrides:` block)
 * onto its base generator def. `additionalProperties` and `maven` are merged
 * key-by-key; every other field is a plain override.
 *
 * @param base      - The base generator def, looked up by id from `generators:`.
 * @param overrides - The partial override from the artifact reference, if any.
 * @returns The merged generator def.
 */
function mergeGeneratorOverride(
  base: GeneratorDefInput,
  overrides: Partial<GeneratorDefInput> | undefined,
): GeneratorDefInput {
  if (!overrides) {
    return base;
  }

  return {
    ...base,
    ...overrides,
    maven: overrides.maven ? { ...base.maven, ...overrides.maven } : base.maven,
    additionalProperties: {
      ...base.additionalProperties,
      ...overrides.additionalProperties,
    },
  };
}

/**
 * Resolves a single artifact reference (string id, or `{ generator, overrides,
 * as }`) into its `{ id, def }` pair, looking up the base generator by id and
 * applying any overrides.
 *
 * @param ref          - The artifact reference from a contract's `artifacts:`
 *                       list.
 * @param generators   - The full `generators:` map from the raw config.
 * @param contractName - The owning contract's name.
 * @returns The artifact's resolved id and generator def (templates not yet
 *          interpolated).
 */
function resolveArtifactRef(
  ref: ArtifactRefInput,
  generators: RootConfigInput["generators"],
  contractName: string,
): { id: string; def: GeneratorDefInput } {
  const generatorId = typeof ref === "string" ? ref : ref.generator;
  const base = generators[generatorId];

  if (!base) {
    const available = Object.keys(generators).sort().join(", ");

    throw new Error(
      `Contract "${contractName}" references unknown generator "${generatorId}" ` +
        `(available: ${available})`,
    );
  }

  const id = typeof ref === "string" ? ref : (ref.as ?? ref.generator);
  const overrides = typeof ref === "string" ? undefined : ref.overrides;

  return { id, def: mergeGeneratorOverride(base, overrides) };
}

/**
 * Interpolates templates and resolves absolute paths for a single artifact.
 *
 * @param id           - The artifact's resolved id (output folder / branch /
 *                       tag segment).
 * @param def          - The (override-merged, not-yet-interpolated) generator
 *                       def.
 * @param rootDir      - Absolute repo root, `readme` template paths are
 *                       resolved relative to this.
 * @param sdkDir       - Absolute path to the SDK output root (`<dist>/sdk`).
 * @param contractName - The owning contract's name.
 * @param context      - The flattened template context for this contract.
 * @returns The fully resolved artifact.
 */
function resolveArtifact(
  id: string,
  def: GeneratorDefInput,
  rootDir: string,
  sdkDir: string,
  contractName: string,
  context: Record<string, string>,
): ResolvedArtifact {
  const resolved = interpolateDeep(def, context);

  return {
    id,
    tool: resolved.tool,
    lang: resolved.lang,
    kind: resolved.kind,
    generator: resolved.generator,
    outputDir: path.join(sdkDir, contractName, id),
    branch: `sdk/svc-${contractName}/${id}`,
    tagPrefix: `svc-${contractName}-${id}`,
    additionalProperties: resolved.additionalProperties,
    package: resolved.package,
    goModule: resolved.goModule,
    goPackageName: resolved.goPackageName,
    maven: resolved.maven,
    readmeTemplate: resolved.readme
      ? path.resolve(rootDir, resolved.readme)
      : undefined,
  };
}

/**
 * Resolves a single contract: its entrypoint path and every artifact in its
 * `artifacts:` list.
 *
 * @param input      - The raw contract config.
 * @param rootDir    - Absolute repo root, entrypoints/`readme` paths are
 *                     resolved relative to this.
 * @param sdkDir     - Absolute path to the SDK output root (`<dist>/sdk`).
 * @param generators - The full `generators:` map from the raw config.
 * @param githubCtx  - `{ owner, repo }`, exposed to templates as
 *                     `{github.owner}`/`{github.repo}`.
 * @param vars       - The `vars:` tree from the raw config, exposed as
 *                     `{vars.*}`.
 * @returns The fully resolved contract.
 */
function resolveContract(
  input: ContractInput,
  rootDir: string,
  sdkDir: string,
  generators: RootConfigInput["generators"],
  githubCtx: { owner: string; repo: string },
  vars: RootConfigInput["vars"],
): ResolvedContract {
  const context = buildTemplateContext({
    service: input.name,
    github: githubCtx,
    vars,
  });

  const artifacts = input.artifacts.map((ref): ResolvedArtifact => {
    const { id, def } = resolveArtifactRef(ref, generators, input.name);

    return resolveArtifact(id, def, rootDir, sdkDir, input.name, context);
  });

  const entrypoint = path.join(rootDir, input.entrypoint);

  return {
    name: input.name,
    title: input.title,
    entrypoint,
    entrypointRelative: path.relative(rootDir, entrypoint),
    artifacts,
  };
}

/**
 * Loads, validates, and fully resolves a CLI config file - the single entry
 * point every command uses to get its configuration.
 *
 * Unlike a build tool bundled into the consumer's own repo, seagull is
 * installed as a dependency, so it has no way to guess where the
 * consumer's config lives on its own - `configPath` must be supplied by the
 * caller (the CLI resolves it via `resolveConfigPath()` in
 * `config/resolve-config-file.ts`, or `--config`).
 *
 * @param configPath - Absolute path to the CLI config file.
 * @returns The fully resolved config.
 */
export function loadConfig(configPath: string): ResolvedConfig {
  const rootDir = path.dirname(configPath);
  const raw = readRawConfig(configPath);

  const distDir = path.resolve(rootDir, raw.paths.dist);
  const specsDir = raw.paths.specs
    ? path.resolve(rootDir, raw.paths.specs)
    : path.join(distDir, "specs");
  const docsDir = raw.paths.docs
    ? path.resolve(rootDir, raw.paths.docs)
    : path.join(distDir, "docs");
  const sdkDir = raw.paths.sdk
    ? path.resolve(rootDir, raw.paths.sdk)
    : path.join(distDir, "sdk");

  const contracts = raw.contracts.map((contract) =>
    resolveContract(
      contract,
      rootDir,
      sdkDir,
      raw.generators,
      raw.github,
      raw.vars,
    ),
  );

  return {
    rootDir,
    paths: { dist: distDir, specs: specsDir, docs: docsDir, sdk: sdkDir },
    github: raw.github,
    vars: raw.vars,
    docs: raw.docs,
    contracts,
    allArtifacts: contracts.flatMap((contract) =>
      contract.artifacts.map((artifact) => ({ contract, artifact })),
    ),
  };
}
