import { parse as parseYaml } from "yaml";

import type { SpecFormat } from "./schema";

export type { SpecFormat } from "./schema";

/**
 * The "primary" format among a `paths.specFormat` list - the one SDK generation,
 * version/hash resolution, and the docs site actually read from when more than
 * one format is configured. By convention, that's whichever format was listed
 * first.
 *
 * @param formats - `config.paths.specFormat` (always non-empty).
 * @returns The primary format.
 */
export function primarySpecFormat(formats: SpecFormat[]): SpecFormat {
  return formats[0]!;
}

/**
 * The filename a contract's bundled spec is written to/read from, e.g.
 * `auth.json` or `auth.yaml` - one place computing this so `bundle`, `generate`,
 * and `docs generate` can't disagree about the extension.
 *
 * @param contractName - The contract's `name`.
 * @param format       - `config.paths.specFormat`.
 * @returns The filename (no directory), e.g. `"auth.yaml"`.
 */
export function specFilename(contractName: string, format: SpecFormat): string {
  return `${contractName}.${format}`;
}

/**
 * Parses a bundled spec's raw file contents according to its configured format.
 * JSON and YAML are both valid inputs to Redocly/openapi-generator/
 * openapi-typescript, so seagull's own parsing has to match: `JSON.parse`
 * rejects trailing commas and comments that valid YAML permits, and would
 * silently misparse a YAML document that happens to look JSON-ish.
 *
 * @param raw    - The raw bundled spec file contents.
 * @param format - `config.paths.specFormat`.
 * @returns The parsed document.
 */
export function parseBundledSpec(raw: string, format: SpecFormat): unknown {
  return format === "json"
    ? (JSON.parse(raw) as unknown)
    : parseYaml(raw, { merge: true });
}
