import type { SdkTool } from "@config/types";

import type { GenerateContext, PrepareContext } from "./types";

/**
 * The root primitive every concrete SDK generator implements.
 *
 * One instance per underlying tool (`openapi-generator-cli`,
 * `openapi-typescript`, ...) - not one per language, since a single tool
 * invocation (e.g. `openapi-generator-cli -g java`/`-g go`) already covers
 * every language it supports. Language-specific behaviour (patching `go.mod`,
 * `package.json`, `pom.xml`, ...) is composed in via patchers rather than
 * living in per-language subclasses.
 */
export abstract class Generator {
  abstract readonly tool: SdkTool;

  /**
   * Optional one-time setup step, run once per tool before any of that tool's
   * {@link generate} calls - for tools like `openapi-typescript` that generate
   * every contract's output in a single global invocation instead of one call
   * per artifact.
   *
   * @param ctx - Every (contract, artifact) pair using this generator's tool.
   */
  prepare?(ctx: PrepareContext): Promise<void>;

  /**
   * Generates a single artifact.
   *
   * @param ctx - The contract, artifact, and resolved version to generate for.
   */
  abstract generate(ctx: GenerateContext): Promise<void>;
}
