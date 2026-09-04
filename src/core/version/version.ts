import { createHash } from "node:crypto";

/**
 * Shape of a bundled OpenAPI document, narrowed to the one field this module
 * cares about.
 */
export interface BundledSpec {
  info?: {
    version?: string;
  };
}

/**
 * Resolves the version to stamp onto a single contract's generated SDK
 * artifacts (npm/Maven packages, Go module tags, git branches, etc.).
 *
 * The single source of truth is that contract's own `info.version` field in its
 * `openapi.yaml` - bump it there and every artifact, package, and git tag for
 * that contract picks up the new version on the next release. Versions are
 * resolved independently per contract: two services can be at different
 * versions at the same time.
 *
 * `SDK_VERSION_OVERRIDE` (wired up from the release workflow's manual `version`
 * input) bypasses the spec entirely and stamps every contract with the same
 * given value. It exists for one-off emergency republishes, not routine
 * releases. Routine releases should always go through `info.version`.
 *
 * @param spec         - The parsed, bundled OpenAPI document for the contract.
 * @param contractName - The contract name, used only for the error message.
 * @returns The resolved version string (no leading `v`).
 * @throws Error if no override is set and the spec has no `info.version`.
 */
export function resolveVersion(
  spec: BundledSpec,
  contractName: string,
): string {
  const override = process.env.SDK_VERSION_OVERRIDE?.trim();

  if (override) {
    return override.replace(/^v/, "");
  }

  const specVersion = spec.info?.version?.trim();

  if (!specVersion) {
    throw new Error(
      `specs/${contractName}/openapi.yaml is missing "info.version" - set it ` +
        `to a semver value. This field is the single source of truth for ` +
        `the ${contractName} contract's SDK version.`,
    );
  }

  return specVersion.replace(/^v/, "");
}

/**
 * Computes a stable content hash of a bundled OpenAPI document's raw JSON text.
 * Stamped alongside `VERSION` into every generated SDK package so
 * `publish-sdk.ts` can tell a genuine no-op republish (same spec, same version)
 * apart from a spec that changed without its `info.version` being bumped.
 *
 * @param raw - The raw bundled spec file contents (JSON text).
 * @returns A `sha256` hex digest of the raw contents.
 */
export function hashSpec(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
