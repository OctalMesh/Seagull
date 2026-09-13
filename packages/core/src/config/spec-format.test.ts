import { describe, expect, it } from "vitest";

import { parseBundledSpec, specFilename } from "./spec-format";

describe("specFilename", () => {
  it("joins the contract name and format with a dot", () => {
    expect(specFilename("auth", "json")).toBe("auth.json");
    expect(specFilename("auth", "yaml")).toBe("auth.yaml");
  });
});

describe("parseBundledSpec", () => {
  it("parses 'json' as strict JSON", () => {
    const result = parseBundledSpec(
      '{"openapi":"3.1.0","info":{"version":"1.0.0"}}',
      "json",
    );

    expect(result).toEqual({
      openapi: "3.1.0",
      info: { version: "1.0.0" },
    });
  });

  it("rejects invalid JSON when format is 'json', even if it happens to be valid YAML", () => {
    // A bare, unquoted top-level scalar - valid YAML, not valid JSON. Proves
    // parseBundledSpec doesn't quietly fall back to a lenient parser.
    expect(() => parseBundledSpec("not json", "json")).toThrow();
  });

  it("parses 'yaml' as YAML", () => {
    const result = parseBundledSpec(
      'openapi: "3.1.0"\ninfo:\n  version: "1.0.0"\n',
      "yaml",
    );

    expect(result).toEqual({
      openapi: "3.1.0",
      info: { version: "1.0.0" },
    });
  });

  it("accepts plain JSON text when format is 'yaml' (JSON is valid YAML)", () => {
    const result = parseBundledSpec(
      '{"openapi":"3.1.0","info":{"version":"1.0.0"}}',
      "yaml",
    );

    expect(result).toEqual({
      openapi: "3.1.0",
      info: { version: "1.0.0" },
    });
  });
});
