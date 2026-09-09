import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { resolveBinPath } from "./resolve-bin";

describe("resolveBinPath", () => {
  it("resolves an installed package's default bin entry to an existing file", () => {
    const bin = resolveBinPath("@redocly/cli", "redocly");

    expect(existsSync(bin)).toBe(true);
    expect(bin).toMatch(/cli\.js$/);
  });

  it("resolves a string-form 'bin' field (not just the object form)", () => {
    const bin = resolveBinPath("prettier", "prettier");

    expect(existsSync(bin)).toBe(true);
    expect(bin).toMatch(/prettier\.cjs$/);
  });

  it("resolves a non-default bin entry when the package exposes multiple", () => {
    const bin = resolveBinPath("@redocly/cli", "openapi");

    expect(existsSync(bin)).toBe(true);
  });

  it("defaults 'binName' to the package's own unscoped name when omitted", () => {
    expect(() => resolveBinPath("@redocly/cli")).toThrow(
      /Could not resolve a "cli" bin entry for package "@redocly\/cli"/,
    );
  });

  it("throws a descriptive error for a package with no matching bin entry", () => {
    expect(() => resolveBinPath("@redocly/cli", "does-not-exist")).toThrow(
      /Could not resolve a "does-not-exist" bin entry for package "@redocly\/cli" - is it installed, and does it expose that bin\?/,
    );
  });

  it("throws when the package itself cannot be resolved", () => {
    expect(() => resolveBinPath("@octalmesh/does-not-exist")).toThrow();
  });
});
