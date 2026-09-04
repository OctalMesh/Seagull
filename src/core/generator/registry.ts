import type { SdkTool } from "@config/types";

import type { Generator } from "./generator";

/**
 * Looks up the concrete {@link Generator} implementation for a given tool name.
 */
export class GeneratorRegistry {
  private readonly generators = new Map<SdkTool, Generator>();

  /**
   * Registers a generator implementation under its own {@link Generator.tool}.
   *
   * @param generator - The generator instance to register.
   * @returns `this`, for chaining.
   */
  register(generator: Generator): this {
    this.generators.set(generator.tool, generator);

    return this;
  }

  /**
   * Resolves the generator implementation for a given tool name.
   *
   * @param tool - The tool name, e.g. `"openapi-generator"`.
   * @returns The registered generator.
   * @throws Error if no generator is registered for that tool.
   */
  resolve(tool: SdkTool): Generator {
    const generator = this.generators.get(tool);

    if (!generator) {
      const available = [...this.generators.keys()].join(", ");

      throw new Error(
        `No generator implementation registered for tool "${tool}" (available: ${available})`,
      );
    }

    return generator;
  }

  /**
   * All distinct tools currently registered.
   *
   * @returns The registered tool names.
   */
  tools(): SdkTool[] {
    return [...this.generators.keys()];
  }
}
