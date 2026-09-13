import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashSpec, resolveVersion } from "./version";

describe("resolveVersion", () => {
  const originalOverride = process.env.SDK_VERSION_OVERRIDE;

  beforeEach(() => {
    delete process.env.SDK_VERSION_OVERRIDE;
  });

  afterEach(() => {
    if (originalOverride === undefined) {
      delete process.env.SDK_VERSION_OVERRIDE;
    } else {
      process.env.SDK_VERSION_OVERRIDE = originalOverride;
    }
  });

  it("returns info.version from the spec, stripped of a leading 'v'", () => {
    expect(resolveVersion({ info: { version: "1.2.3" } }, "auth")).toBe(
      "1.2.3",
    );
    expect(resolveVersion({ info: { version: "v1.2.3" } }, "auth")).toBe(
      "1.2.3",
    );
  });

  it("trims whitespace around info.version", () => {
    expect(resolveVersion({ info: { version: "  1.0.0  " } }, "auth")).toBe(
      "1.0.0",
    );
  });

  it("throws a descriptive error when info.version is missing", () => {
    expect(() => resolveVersion({}, "auth")).toThrow(
      /specs\/auth\/openapi\.yaml is missing "info\.version"/,
    );
  });

  it("throws when info.version is present but empty/whitespace-only", () => {
    expect(() =>
      resolveVersion({ info: { version: "   " } }, "catalog"),
    ).toThrow(/specs\/catalog\/openapi\.yaml is missing "info\.version"/);
  });

  it("SDK_VERSION_OVERRIDE bypasses info.version entirely", () => {
    process.env.SDK_VERSION_OVERRIDE = "9.9.9";

    expect(resolveVersion({}, "auth")).toBe("9.9.9");
    expect(resolveVersion({ info: { version: "1.0.0" } }, "auth")).toBe(
      "9.9.9",
    );
  });

  it("strips a leading 'v' from SDK_VERSION_OVERRIDE too", () => {
    process.env.SDK_VERSION_OVERRIDE = "v2.0.0";

    expect(resolveVersion({}, "auth")).toBe("2.0.0");
  });

  it("treats a blank SDK_VERSION_OVERRIDE as unset", () => {
    process.env.SDK_VERSION_OVERRIDE = "   ";

    expect(() => resolveVersion({}, "auth")).toThrow(
      /is missing "info\.version"/,
    );
  });
});

describe("hashSpec", () => {
  it("computes a stable sha256 hex digest of the raw content", () => {
    const raw = '{"info":{"version":"1.0.0"}}';

    expect(hashSpec(raw)).toBe(createHash("sha256").update(raw).digest("hex"));
  });

  it("is deterministic for the same input", () => {
    const raw = '{"a":1}';

    expect(hashSpec(raw)).toBe(hashSpec(raw));
  });

  it("produces different hashes for different content", () => {
    expect(hashSpec('{"a":1}')).not.toBe(hashSpec('{"a":2}'));
  });

  it("is sensitive to whitespace differences (raw text, not semantic JSON)", () => {
    expect(hashSpec('{"a":1}')).not.toBe(hashSpec('{ "a": 1 }'));
  });
});
