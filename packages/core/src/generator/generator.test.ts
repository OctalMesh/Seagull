import { describe, expect, it, vi } from "vitest";

import type { SdkTool } from "../config/types";
import { Generator } from "./generator";
import type { GenerateContext, PrepareContext } from "./types";

class StubGenerator extends Generator {
  readonly tool: SdkTool = "openapi-typescript";
  readonly generateSpy = vi.fn((_ctx: GenerateContext) => Promise.resolve());

  async generate(ctx: GenerateContext): Promise<void> {
    await this.generateSpy(ctx);
  }
}

describe("Generator", () => {
  it("does not require 'prepare' to be implemented", () => {
    const generator = new StubGenerator();

    expect(typeof generator.prepare).toBe("undefined");
  });

  it("subclasses can implement 'prepare' as an optional hook", async () => {
    const prepareSpy = vi.fn((_ctx: PrepareContext) => Promise.resolve());

    class WithPrepare extends Generator {
      readonly tool: SdkTool = "openapi-generator";

      override async prepare(ctx: PrepareContext): Promise<void> {
        await prepareSpy(ctx);
      }

      generate(): Promise<void> {
        return Promise.resolve();
      }
    }

    const generator = new WithPrepare();

    await generator.prepare?.({ rootDir: "/tmp", entries: [] });

    expect(prepareSpy).toHaveBeenCalledOnce();
  });

  it("exposes 'tool' as a readonly discriminator", () => {
    const generator = new StubGenerator();

    expect(generator.tool).toBe("openapi-typescript");
  });

  it("requires 'generate' to be implemented and calls through to it", async () => {
    const generator = new StubGenerator();
    const ctx = {} as GenerateContext;

    await generator.generate(ctx);

    expect(generator.generateSpy).toHaveBeenCalledWith(ctx);
  });
});
