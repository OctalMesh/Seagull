import { defineConfig } from "vitest/config";

const packages = ["cli", "core", "docs"];

/**
 * Vitest configuration.
 *
 * @see {@link https://vitest.dev/config Vitest documentation}
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },

  test: {
    environment: "node",
    passWithNoTests: true,
    globals: true,
    reporters: ["default", ["html", { singleFile: true }]],

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["{,packages/*/}src/**/*.?(c|m)[jt]s?(x)"],
      exclude: [
        "**/*.{test,spec}.ts",
        "**/test-support/**",
        "**/index.ts",
        "**/types.ts",
      ],
    },

    projects: [
      ...packages.map((pkg) => ({
        extends: true,
        test: {
          name: `unit:${pkg}`,
          include: [`packages/${pkg}/src/**/*.{test,spec}.ts`],
        },
      })),

      {
        extends: true,
        test: {
          name: "unit:root",
          include: ["src/**/*.{test,spec}.ts"],
        },
      },

      {
        extends: true,
        test: {
          name: "e2e",
          include: ["e2e/**/*.e2e.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
