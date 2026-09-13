import { describe, expect, it } from "vitest";

import type { SdkTool } from "../config/types";
import { Generator } from "./generator";
import { GeneratorRegistry } from "./registry";
import type { GenerateContext } from "./types";

class FakeGenerator extends Generator {
  readonly tool: SdkTool;

  constructor(tool: SdkTool) {
    super();
    this.tool = tool;
  }

  generate(_ctx: GenerateContext): Promise<void> {
    return Promise.resolve();
  }
}

describe("GeneratorRegistry", () => {
  it("resolves a generator by its registered tool", () => {
    const registry = new GeneratorRegistry();
    const generator = new FakeGenerator("openapi-generator");

    registry.register(generator);

    expect(registry.resolve("openapi-generator")).toBe(generator);
  });

  it("returns 'this' from register(), enabling chaining", () => {
    const registry = new GeneratorRegistry();
    const result = registry
      .register(new FakeGenerator("openapi-generator"))
      .register(new FakeGenerator("openapi-typescript"));

    expect(result).toBe(registry);
  });

  it("throws a descriptive error for an unregistered tool", () => {
    const registry = new GeneratorRegistry();

    registry.register(new FakeGenerator("openapi-typescript"));

    expect(() => registry.resolve("openapi-generator")).toThrow(
      /No generator implementation registered for tool "openapi-generator" \(available: openapi-typescript\)/,
    );
  });

  it("throws with an empty available-list when nothing is registered", () => {
    const registry = new GeneratorRegistry();

    expect(() => registry.resolve("openapi-generator")).toThrow(
      /\(available: \)/,
    );
  });

  it("re-registering the same tool replaces the previous generator", () => {
    const registry = new GeneratorRegistry();
    const first = new FakeGenerator("openapi-generator");
    const second = new FakeGenerator("openapi-generator");

    registry.register(first).register(second);

    expect(registry.resolve("openapi-generator")).toBe(second);
  });

  it("tools() lists every distinct registered tool", () => {
    const registry = new GeneratorRegistry();

    registry
      .register(new FakeGenerator("openapi-generator"))
      .register(new FakeGenerator("openapi-typescript"));

    expect(registry.tools().sort()).toEqual([
      "openapi-generator",
      "openapi-typescript",
    ]);
  });

  it("tools() returns an empty array for a fresh registry", () => {
    expect(new GeneratorRegistry().tools()).toEqual([]);
  });
});
