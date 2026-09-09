import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";

import type { ResolvedConfig } from "@octalmesh/seagull-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import { generateDocsSite } from "./generate-docs";

const SCRIPT_REGEX = /<script>([\s\S]*?)<\/script>/;

function makeConfig(
  rootDir: string,
  overrides: Partial<ResolvedConfig> = {},
): ResolvedConfig {
  const dist = path.join(rootDir, "dist");

  return {
    configVersion: 1,
    rootDir,
    paths: {
      dist,
      specs: path.join(dist, "specs"),
      docs: path.join(dist, "docs"),
      sdk: path.join(dist, "sdk"),
    },
    github: { owner: "OctalMesh", repo: "ows-contracts" },
    vars: {},
    docs: {
      server: { host: "localhost", port: 8080 },
      metadata: {
        title: "OWS Docs",
        description: "OctalMesh Web Shop API documentation",
        favicon: "/favicon.ico",
        baseServerUrl: "https://api.octalmesh.com",
      },
    },
    contracts: [
      {
        name: "auth",
        title: "Auth Service API",
        entrypoint: path.join(rootDir, "specs/auth/openapi.yaml"),
        entrypointRelative: path.join("specs", "auth", "openapi.yaml"),
        artifacts: [],
      },
      {
        name: "catalog",
        title: "Catalog Service API",
        entrypoint: path.join(rootDir, "specs/catalog/openapi.yaml"),
        entrypointRelative: path.join("specs", "catalog", "openapi.yaml"),
        artifacts: [],
      },
    ],
    allArtifacts: [],
    ...overrides,
  };
}

describe("generateDocsSite", () => {
  let dir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-docsgen-"));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  async function writeBundledSpecs(config: ResolvedConfig): Promise<void> {
    await mkdir(config.paths.specs, { recursive: true });

    for (const contract of config.contracts) {
      await writeFile(
        path.join(config.paths.specs, `${contract.name}.json`),
        JSON.stringify({
          openapi: "3.1.0",
          info: { title: contract.title, version: "1.0.0" },
          paths: {},
        }),
      );
    }
  }

  it("copies each contract's bundled spec into docs/specs/<name>.json", async () => {
    const config = makeConfig(dir);

    await writeBundledSpecs(config);
    await generateDocsSite(config);

    const authSpec = JSON.parse(
      await readFile(
        path.join(config.paths.docs, "specs", "auth.json"),
        "utf8",
      ),
    ) as { info: { title: string } };
    const catalogSpec = JSON.parse(
      await readFile(
        path.join(config.paths.docs, "specs", "catalog.json"),
        "utf8",
      ),
    ) as { info: { title: string } };

    expect(authSpec.info.title).toBe("Auth Service API");
    expect(catalogSpec.info.title).toBe("Catalog Service API");
  });

  it("recreates docs/ (clears any stale previous output)", async () => {
    const config = makeConfig(dir);

    await mkdir(config.paths.docs, { recursive: true });
    await writeFile(path.join(config.paths.docs, "stale.html"), "old");
    await writeBundledSpecs(config);

    await generateDocsSite(config);

    await expect(
      readFile(path.join(config.paths.docs, "stale.html"), "utf8"),
    ).rejects.toThrow();
  });

  it("copies the real @scalar/api-reference standalone browser bundle to docs/scalar.js", async () => {
    const config = makeConfig(dir);

    await writeBundledSpecs(config);
    await generateDocsSite(config);

    const scalarJs = await readFile(
      path.join(config.paths.docs, "scalar.js"),
      "utf8",
    );

    expect(scalarJs.length).toBeGreaterThan(1000);
  });

  it("writes an index.html embedding the docs metadata and a source entry per contract", async () => {
    const config = makeConfig(dir);

    await writeBundledSpecs(config);
    await generateDocsSite(config);

    const html = await readFile(
      path.join(config.paths.docs, "index.html"),
      "utf8",
    );

    expect(html).toContain('baseServerURL: "https://api.octalmesh.com"');
    expect(html).toContain('favicon: "/favicon.ico"');
    expect(html).toContain('title: "OWS Docs"');
    expect(html).toContain(
      'description: "OctalMesh Web Shop API documentation"',
    );
    // noinspection HtmlUnknownTarget
    expect(html).toContain('<script src="./scalar.js"></script>');

    expect(html).toContain('title: "Auth Service API"');
    expect(html).toContain('slug: "auth"');
    expect(html).toContain('url: "./specs/auth.json"');
    expect(html).toContain('title: "Catalog Service API"');
    expect(html).toContain('slug: "catalog"');
  });

  it("marks only the first contract as the default source", async () => {
    const config = makeConfig(dir);

    await writeBundledSpecs(config);
    await generateDocsSite(config);

    const html = await readFile(
      path.join(config.paths.docs, "index.html"),
      "utf8",
    );

    const authBlockStart = html.indexOf('slug: "auth"');
    const catalogBlockStart = html.indexOf('slug: "catalog"');
    const defaultOccurrences = (html.match(/default: true/g) ?? []).length;

    expect(defaultOccurrences).toBe(1);

    const defaultIndex = html.indexOf("default: true");

    expect(defaultIndex).toBeGreaterThan(authBlockStart);
    expect(defaultIndex).toBeLessThan(catalogBlockStart);
  });

  it("safely escapes special characters (quotes, angle brackets) in metadata and titles alike", async () => {
    const config = makeConfig(dir, {
      docs: {
        server: { host: "localhost", port: 8080 },
        metadata: {
          title: 'Docs with "quotes" & <brackets>',
          description: "line1\nline2",
          favicon: "/favicon.ico",
          baseServerUrl: "https://api.octalmesh.com",
        },
      },
      contracts: [
        {
          name: "auth",
          title: 'Auth "Service" API',
          entrypoint: path.join(dir, "specs/auth/openapi.yaml"),
          entrypointRelative: path.join("specs", "auth", "openapi.yaml"),
          artifacts: [],
        },
      ],
    });

    await writeBundledSpecs(config);
    await generateDocsSite(config);

    const html = await readFile(
      path.join(config.paths.docs, "index.html"),
      "utf8",
    );

    expect(html).toContain(JSON.stringify('Auth "Service" API'));
    expect(html).toContain(
      `title: ${JSON.stringify('Docs with "quotes" & <brackets>')}`,
    );
    expect(html).toContain(`description: ${JSON.stringify("line1\nline2")}`);

    const scriptMatch = SCRIPT_REGEX.exec(html);

    expect(scriptMatch).not.toBeNull();
    expect(() => {
      new vm.Script(scriptMatch![1]!);
    }).not.toThrow();
  });

  it("logs both the scalar-copy and the final summary line", async () => {
    const config = makeConfig(dir);

    await writeBundledSpecs(config);
    await generateDocsSite(config);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Copied Scalar script to"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Generated documentation website at ${config.paths.docs}`,
      ),
    );
  });

  it("rejects when a contract's bundled spec is missing from dist/specs (bundle wasn't run first)", async () => {
    const config = makeConfig(dir);

    await expect(generateDocsSite(config)).rejects.toThrow();
  });
});
