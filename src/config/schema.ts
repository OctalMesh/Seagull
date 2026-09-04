import { z } from "zod";

/**
 * A free-form tree of leaf values, used for the `vars:` block in the CLI config.
 * Nest however deep is useful - every leaf becomes addressable as
 * `{vars.<dot.path>}` in templated fields.
 */
export type VarsTree = { [key: string]: string | number | boolean | VarsTree };

export const varsTreeSchema: z.ZodType<VarsTree> = z.lazy(() =>
  z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), varsTreeSchema]),
  ),
);

export const githubSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const pathsSchema = z.object({
  dist: z.string().min(1).default("dist"),
  specs: z.string().min(1).optional(),
  docs: z.string().min(1).optional(),
  sdk: z.string().min(1).optional(),
});

export const docsSchema = z.object({
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
  }),
  metadata: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    favicon: z.string().min(1),
    baseServerUrl: z.string().min(1),
  }),
});

export const sdkToolSchema = z.enum([
  "openapi-generator",
  "openapi-typescript",
]);
export const sdkLangSchema = z.enum(["typescript", "go", "java"]);
export const sdkKindSchema = z.enum(["client", "server"]);

/**
 * `-g`/`--additional-properties` values: openapi-generator accepts strings,
 * numbers and booleans, all rendered as `key=value` on the CLI.
 */
export const additionalPropertiesSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .default({});

export const mavenCoordsSchema = z.object({
  groupId: z.string().min(1),
  artifactId: z.string().min(1),
});

/**
 * The shape of a generator "recipe", without the cross-field checks below -
 * kept separate so {@link artifactRefSchema}'s `overrides:` can `.partial()`
 * it (zod rejects `.partial()` on a schema with `.check()` refinements
 * attached).
 */
const generatorDefBaseSchema = z.object({
  tool: sdkToolSchema,
  lang: sdkLangSchema,
  kind: sdkKindSchema,
  /**
   * `openapi-generator -g <generator>` value. Required when `tool` is
   * `openapi-generator`.
   */
  generator: z.string().min(1).optional(),
  /** npm package name template, e.g. `"@{vars.org}/{service}-client"`. */
  package: z.string().min(1).optional(),
  goModule: z.string().min(1).optional(),
  goPackageName: z.string().min(1).optional(),
  maven: mavenCoordsSchema.optional(),
  additionalProperties: additionalPropertiesSchema,
  /**
   * Optional path (relative to the config file's directory) to a custom README
   * template for this artifact - supports the same `{...}` placeholders as
   * naming templates, plus `{version}`, `{title}`, and `{artifact.*}`. If
   * omitted, a built-in default template for the artifact's language/kind is
   * used instead.
   */
  readme: z.string().min(1).optional(),
});

/**
 * A single generator "recipe": which tool to invoke and how. Referenced by id
 * from one or more contracts' `artifacts:` list.
 */
export const generatorDefSchema = generatorDefBaseSchema.check((ctx) => {
  const value = ctx.value;

  if (value.tool === "openapi-generator" && !value.generator) {
    ctx.issues.push({
      code: "custom",
      message: '"generator" is required when tool is "openapi-generator"',
      input: value,
    });
  }

  if (value.lang === "go" && !value.goModule) {
    ctx.issues.push({
      code: "custom",
      message: '"goModule" is required for lang "go"',
      input: value,
    });
  }

  if (value.lang === "java" && !value.maven) {
    ctx.issues.push({
      code: "custom",
      message: '"maven" ({ groupId, artifactId }) is required for lang "java"',
      input: value,
    });
  }

  if (value.lang === "typescript" && !value.package) {
    ctx.issues.push({
      code: "custom",
      message: '"package" is required for lang "typescript"',
      input: value,
    });
  }
});

export type GeneratorDefInput = z.infer<typeof generatorDefSchema>;

export const generatorsSchema = z.record(z.string(), generatorDefSchema);

/**
 * A contract's reference to a generator by id. The plain-string form just runs
 * that generator as-is; the object form lets one contract tweak a shared
 * generator (extra/overridden `additionalProperties`, a different
 * `maven`/`package`/`readme`/... value) without duplicating the whole recipe
 * under a new id, and `as` renames the artifact's own id (output
 * folder / branch / tag segment) if a contract needs two variants of the same
 * base generator.
 */
export const artifactRefSchema = z.union([
  z.string().min(1),
  z.object({
    generator: z.string().min(1),
    as: z.string().min(1).optional(),
    overrides: generatorDefBaseSchema.partial().optional(),
  }),
]);

export const contractSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  entrypoint: z.string().min(1),
  artifacts: z.array(artifactRefSchema).min(1),
});

export const rootConfigSchema = z.object({
  github: githubSchema,
  vars: varsTreeSchema.default({}),
  paths: pathsSchema.default({ dist: "dist" }),
  docs: docsSchema,
  generators: generatorsSchema,
  contracts: z.array(contractSchema).min(1),
});

export type RootConfigInput = z.infer<typeof rootConfigSchema>;
export type ArtifactRefInput = z.infer<typeof artifactRefSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
