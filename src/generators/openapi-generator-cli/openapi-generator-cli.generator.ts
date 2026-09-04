import { mkdir } from "node:fs/promises";

import { Generator } from "@core/generator/generator";
import type { GenerateContext } from "@core/generator/types";
import { run } from "@core/process/exec";
import { resolveBinPath } from "@core/process/resolve-bin";

import type { ResolvedArtifact, SdkTool } from "@config/types";

import { GoModulePatcher } from "./patchers/go-module.patcher";
import { MavenPomPatcher } from "./patchers/maven.patcher";
import { NpmPackagePatcher } from "./patchers/npm.patcher";
import type { Patcher } from "./patchers/patcher";

/**
 * Additional-properties that are fully derivable from an artifact's own
 * `package`/`goPackageName`/`maven` fields - conventional openapi-generator
 * knobs (`npmName`, `groupId`, ...) that would otherwise have to be duplicated
 * by hand in every generator's `additionalProperties:` block, in lockstep with
 * those same fields. Tool-specific tuning that isn't derivable this way
 * (`library=restclient`, `withGoMod`, ...) still lives in
 * `additionalProperties:` and is layered on top of these.
 *
 * @param artifact - The resolved artifact to derive properties for.
 * @returns The derived additional-properties, before the artifact's own
 *          `additionalProperties` are layered on top.
 */
function deriveAdditionalProperties(
  artifact: ResolvedArtifact,
): Record<string, string> {
  if (artifact.lang === "typescript" && artifact.package) {
    return { npmName: artifact.package };
  }

  if (artifact.lang === "go" && artifact.goPackageName) {
    return { packageName: artifact.goPackageName };
  }

  if (artifact.lang === "java" && artifact.maven) {
    const invokerPackage = `${artifact.maven.groupId}.${artifact.kind}`;

    return {
      groupId: artifact.maven.groupId,
      artifactId: artifact.maven.artifactId,
      invokerPackage,
      apiPackage: `${invokerPackage}.api`,
      modelPackage: `${invokerPackage}.model`,
    };
  }

  return {};
}

/**
 * Renders an artifact's additional-properties (derived + explicit, explicit
 * wins on conflicts) as the `key=value,key=value` string
 * `openapi-generator-cli --additional-properties` expects.
 *
 * @param artifact - The resolved artifact.
 * @returns The rendered `--additional-properties` value.
 */
function buildAdditionalPropertiesArg(artifact: ResolvedArtifact): string {
  const merged = {
    ...deriveAdditionalProperties(artifact),
    ...artifact.additionalProperties,
  };

  return Object.entries(merged)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(",");
}

/**
 * Wraps `openapi-generator-cli` - the single tool implementation behind every
 * `-g` template (`typescript-fetch`, `go`, `go-server`, `java`, `spring`, ...),
 * regardless of language. Language-specific output patching is delegated to a
 * {@link Patcher}, selected by `artifact.lang`.
 */
export class OpenApiGeneratorCli extends Generator {
  readonly tool: SdkTool = "openapi-generator";

  private readonly patchers: Partial<
    Record<ResolvedArtifact["lang"], Patcher>
  > = {
    go: new GoModulePatcher(),
    typescript: new NpmPackagePatcher(),
    java: new MavenPomPatcher(),
  };

  async generate(ctx: GenerateContext): Promise<void> {
    const { artifact, rootDir, specInputPath } = ctx;

    if (!artifact.generator) {
      throw new Error(
        `Artifact "${artifact.id}" uses tool "openapi-generator" but has no "generator" value`,
      );
    }

    await mkdir(artifact.outputDir, { recursive: true });

    const bin = resolveBinPath(
      "@openapitools/openapi-generator-cli",
      "openapi-generator-cli",
    );

    await run(
      "node",
      [
        bin,
        "generate",
        "-i",
        specInputPath,
        "-g",
        artifact.generator,
        "-o",
        artifact.outputDir,
        `--additional-properties=${buildAdditionalPropertiesArg(artifact)}`,
      ],
      rootDir,
    );

    await this.patchers[artifact.lang]?.patch(ctx);
  }
}
