const PLACEHOLDER = /\{([a-zA-Z0-9_.]+)}/g;

export type TemplateScope = Record<string, unknown>;
export type TemplateContext = Readonly<Record<string, string>>;

/**
 * Replaces every `{dot.path}` placeholder in `template` with its value from
 * `context`, throwing a descriptive error if a placeholder has no match -
 * a typo'd `{vars.org}` should fail loudly at config-load time, not silently
 * produce a package named literally `@{vars.org}/...`.
 *
 * @param template - The template string, e.g. `"@{vars.org}/{service}-client"`.
 * @param context  - The flattened context to resolve placeholders against.
 * @returns The interpolated string.
 */
export function interpolate(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(PLACEHOLDER, (_match, key: string) => {
    const value = context[key];

    if (value === undefined) {
      const available = Object.keys(context).sort().join(", ");

      throw new Error(
        `Unknown template placeholder "{${key}}" in "${template}" (available: ${available})`,
      );
    }

    return value;
  });
}

/**
 * Recursively interpolates every string value in `value` (walking through plain
 * objects), leaving non-string leaves untouched. Used to resolve
 * `additionalProperties` maps, which may mix templated strings with plain
 * booleans/numbers.
 *
 * @param value   - The value (string, object, or primitive) to interpolate.
 * @param context - The flattened context to resolve placeholders against.
 * @returns A deep copy of `value` with every string interpolated.
 */
export function interpolateDeep<T>(value: T, context: TemplateContext): T {
  // Every `as T` below asserts a value back into the exact shape it was
  // destructured from - `T` is unconstrained here (it's whatever shape the
  // caller's config value happens to be), which is the shape-preserving
  // contract this function promises, not an actual type hole in practice.
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  if (typeof value === "string") {
    const interpolated: string = interpolate(value, context);

    return interpolated as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateDeep(item, context)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        interpolateDeep(child, context),
      ]),
    ) as T;
  }

  /* eslint-enable @typescript-eslint/no-unsafe-return */
  return value;
}

/**
 * Flattens a nested scope object (e.g. `{ service: "auth", vars: { org: "x" } }`)
 * into dot-path lookup keys (`{ service: "auth", "vars.org": "x" }`) for use
 * with {@link interpolate}.
 *
 * @param scope - The nested scope to flatten.
 * @returns A flat dot-path -> string map.
 */
export function buildTemplateContext(scope: TemplateScope): TemplateContext {
  const out: Record<string, string> = {};

  flatten(scope, "", out);

  return out;
}

function flatten(
  value: unknown,
  prefix: string,
  out: Record<string, string>,
): void {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }

    return;
  }

  if (value === undefined) {
    return;
  }

  // Leaf values from parsed YAML/JSON config are always string/number/boolean
  // (VarsTree's own type guarantees this) - String() is safe here.
  /* eslint-disable-next-line @typescript-eslint/no-base-to-string */
  out[prefix] = String(value);
}
