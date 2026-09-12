import { defineConfig } from "tsdown";

/**
 * Tsdown configuration
 *
 * @see {@link https://tsdown.dev Tsdown documentation}
 */
// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  platform: "node",
  format: ["esm"],
  target: "node24",
  dts: {
    entry: "src/index.ts",
  },
  clean: true,
  sourcemap: true,
});
