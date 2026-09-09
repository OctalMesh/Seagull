import { describe, expect, it } from "vitest";

import { buildTemplateContext, interpolate, interpolateDeep } from "./template";

describe("interpolate", () => {
  it("replaces a single placeholder", () => {
    expect(interpolate("hello {name}", { name: "world" })).toBe("hello world");
  });

  it("replaces multiple placeholders, including repeats", () => {
    expect(interpolate("{a}-{b}-{a}", { a: "x", b: "y" })).toBe("x-y-x");
  });

  it("supports dotted placeholder keys", () => {
    expect(
      interpolate("@{vars.org}/{service}-client", {
        "vars.org": "octalmesh",
        service: "auth",
      }),
    ).toBe("@octalmesh/auth-client");
  });

  it("returns the template unchanged when it has no placeholders", () => {
    expect(interpolate("no placeholders here", {})).toBe(
      "no placeholders here",
    );
  });

  it("leaves non-placeholder braces-free text alone alongside real placeholders", () => {
    expect(interpolate("v{version}!!", { version: "1.0.0" })).toBe("v1.0.0!!");
  });

  it("throws a descriptive error for an unknown placeholder", () => {
    expect(() => interpolate("{missing}", { known: "x" })).toThrow(
      /Unknown template placeholder "\{missing\}" in "\{missing\}" \(available: known\)/,
    );
  });

  it("lists available keys sorted in the error message", () => {
    expect(() => interpolate("{missing}", { zeta: "1", alpha: "2" })).toThrow(
      /available: alpha, zeta/,
    );
  });

  it("throws on an empty context when a placeholder is present", () => {
    expect(() => interpolate("{x}", {})).toThrow(/available: /);
  });

  it("does not treat a placeholder-shaped key with invalid characters as one", () => {
    expect(interpolate("{not a placeholder}", {})).toBe("{not a placeholder}");
  });

  it("resolves a value that itself contains no braces even if empty string", () => {
    expect(interpolate("[{x}]", { x: "" })).toBe("[]");
  });
});

describe("interpolateDeep", () => {
  it("interpolates a bare string", () => {
    expect(interpolateDeep("{a}", { a: "1" })).toBe("1");
  });

  it("leaves non-string primitives untouched", () => {
    expect(interpolateDeep(42, {})).toBe(42);
    expect(interpolateDeep(true, {})).toBe(true);
    expect(interpolateDeep(null, {})).toBe(null);
    expect(interpolateDeep(undefined, {})).toBe(undefined);
  });

  it("recurses into arrays", () => {
    expect(interpolateDeep(["{a}", "{b}", 3], { a: "1", b: "2" })).toEqual([
      "1",
      "2",
      3,
    ]);
  });

  it("recurses into plain objects, preserving shape", () => {
    const result = interpolateDeep(
      { npmName: "{pkg}", withGoMod: true, count: 3 },
      { pkg: "@org/pkg" },
    );

    expect(result).toEqual({
      npmName: "@org/pkg",
      withGoMod: true,
      count: 3,
    });
  });

  it("recurses into nested structures (object of arrays of objects)", () => {
    const result = interpolateDeep(
      { list: [{ id: "{id}" }, { id: "static" }] },
      { id: "42" },
    );

    expect(result).toEqual({ list: [{ id: "42" }, { id: "static" }] });
  });

  it("produces a deep copy rather than mutating the input", () => {
    const input = { a: { b: "{x}" } };
    const result = interpolateDeep(input, { x: "y" });

    expect(result).not.toBe(input);
    expect(result.a).not.toBe(input.a);
    expect(input.a.b).toBe("{x}");
  });
});

describe("buildTemplateContext", () => {
  it("flattens a nested scope into dot-path keys", () => {
    expect(
      buildTemplateContext({
        service: "auth",
        github: { owner: "OctalMesh", repo: "ows-contracts" },
        vars: { org: "octalmesh", nested: { deep: "value" } },
      }),
    ).toEqual({
      service: "auth",
      "github.owner": "OctalMesh",
      "github.repo": "ows-contracts",
      "vars.org": "octalmesh",
      "vars.nested.deep": "value",
    });
  });

  it("stringifies numbers and booleans at leaf positions", () => {
    expect(
      buildTemplateContext({ vars: { port: 8080, enabled: true } }),
    ).toEqual({ "vars.port": "8080", "vars.enabled": "true" });
  });

  it("skips undefined leaves entirely", () => {
    expect(buildTemplateContext({ a: "x", b: undefined })).toEqual({ a: "x" });
  });

  it("does not descend into arrays as if they were nested scopes", () => {
    const result = buildTemplateContext({ list: ["a", "b"] as never });

    expect(result).toEqual({ list: "a,b" });
  });

  it("returns an empty object for an empty scope", () => {
    expect(buildTemplateContext({})).toEqual({});
  });

  it("round-trips with interpolate for a realistic artifact context", () => {
    const context = buildTemplateContext({
      service: "auth",
      id: "ts-client",
      github: { owner: "OctalMesh", repo: "ows-contracts" },
      vars: { org: "octalmesh" },
    });

    expect(interpolate("sdk/svc-{service}/{id}", context)).toBe(
      "sdk/svc-auth/ts-client",
    );
    expect(interpolate("@{vars.org}/{service}-client", context)).toBe(
      "@octalmesh/auth-client",
    );
    expect(
      interpolate("https://github.com/{github.owner}/{github.repo}", context),
    ).toBe("https://github.com/OctalMesh/ows-contracts");
  });
});
