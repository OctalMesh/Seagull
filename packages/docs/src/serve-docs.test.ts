import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ResolvedConfig } from "@octalmesh/seagull-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import { serveDocsSite } from "./serve-docs";

function makeConfig(docsDir: string, port = 0): ResolvedConfig {
  return {
    configVersion: 1,
    rootDir: path.dirname(docsDir),
    paths: {
      dist: path.dirname(docsDir),
      specs: path.join(path.dirname(docsDir), "specs"),
      docs: docsDir,
      sdk: path.join(path.dirname(docsDir), "sdk"),
    },
    github: { owner: "OctalMesh", repo: "ows-contracts" },
    vars: {},
    docs: {
      server: { host: "127.0.0.1", port },
      metadata: {
        title: "t",
        description: "d",
        favicon: "f",
        baseServerUrl: "https://example.com",
      },
    },
    contracts: [],
    allArtifacts: [],
  };
}

describe("serveDocsSite", () => {
  let dir: string;
  let docsDir: string;
  let logSpy: MockInstance;
  let server: Server | undefined;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-docsserve-"));
    docsDir = path.join(dir, "dist", "docs");
    await mkdir(docsDir, { recursive: true });
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    server = undefined;
  });

  afterEach(async () => {
    await new Promise<void>((resolveClose) => {
      if (server?.listening) {
        server.close(() => resolveClose());
      } else {
        resolveClose();
      }
    });
    await rm(dir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  function assignedPort(): number {
    const address = server!.address();

    if (address === null || typeof address === "string") {
      throw new Error("Expected an AddressInfo from a TCP server");
    }

    return address.port;
  }

  it("starts listening and resolves the underlying http.Server once it's up", async () => {
    server = await serveDocsSite(makeConfig(docsDir));

    expect(server.listening).toBe(true);
  });

  it("logs the URL it's serving on", async () => {
    server = await serveDocsSite(makeConfig(docsDir, 4321));

    expect(logSpy).toHaveBeenCalledWith(
      "Scalar documentation: http://127.0.0.1:4321",
    );
  });

  it("serves index.html at the root with the correct content-type", async () => {
    await writeFile(path.join(docsDir, "index.html"), "<h1>Docs</h1>");
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(`http://127.0.0.1:${assignedPort()}/`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await res.text()).toBe("<h1>Docs</h1>");
  });

  it("serves a nested file with the right MIME type by extension", async () => {
    await mkdir(path.join(docsDir, "specs"), { recursive: true });
    await writeFile(
      path.join(docsDir, "specs", "auth.json"),
      '{"openapi":"3.1.0"}',
    );
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(
      `http://127.0.0.1:${assignedPort()}/specs/auth.json`,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(await res.json()).toEqual({ openapi: "3.1.0" });
  });

  it("serves a directory's index.html when the URL has no filename", async () => {
    await mkdir(path.join(docsDir, "sub"), { recursive: true });
    await writeFile(path.join(docsDir, "sub", "index.html"), "<p>sub</p>");
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(`http://127.0.0.1:${assignedPort()}/sub`);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<p>sub</p>");
  });

  it("returns 404 for a file that doesn't exist", async () => {
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(
      `http://127.0.0.1:${assignedPort()}/does-not-exist.html`,
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 (not 500) for a directory with no index.html", async () => {
    await mkdir(path.join(docsDir, "empty-dir"), { recursive: true });
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(`http://127.0.0.1:${assignedPort()}/empty-dir`);

    expect(res.status).toBe(404);
  });

  it("returns 404 when 'index.html' resolves to a directory rather than a file", async () => {
    await mkdir(path.join(docsDir, "weird-dir", "index.html"), {
      recursive: true,
    });
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(`http://127.0.0.1:${assignedPort()}/weird-dir`);

    expect(res.status).toBe(404);
  });

  it("defaults to application/octet-stream for unrecognized extensions", async () => {
    await writeFile(path.join(docsDir, "data.bin"), "binary-ish content");
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(`http://127.0.0.1:${assignedPort()}/data.bin`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
  });

  it("blocks path traversal outside the docs root via '../' segments", async () => {
    await writeFile(path.join(dir, "dist", "secret.txt"), "top secret");
    await writeFile(path.join(docsDir, "index.html"), "<h1>Docs</h1>");
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(`http://127.0.0.1:${assignedPort()}/../secret.txt`);

    expect(res.status).not.toBe(200);
  });

  it("blocks a URL-encoded path traversal attempt", async () => {
    await writeFile(path.join(dir, "dist", "secret.txt"), "top secret");
    await writeFile(path.join(docsDir, "index.html"), "<h1>Docs</h1>");
    server = await serveDocsSite(makeConfig(docsDir));

    const res = await fetch(
      `http://127.0.0.1:${assignedPort()}/%2e%2e/secret.txt`,
    );
    const body = await res.text();

    expect(res.status).not.toBe(200);
    expect(body).not.toContain("top secret");
  });

  it("returns 400 for a request with no url (malformed request line)", async () => {
    server = await serveDocsSite(makeConfig(docsDir));

    const response = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    const [handler] = server.listeners("request");

    (handler as (req: unknown, res: unknown) => void)({ url: "" }, response);

    expect(response.writeHead).toHaveBeenCalledWith(400);
    expect(response.end).toHaveBeenCalled();
  });

  it("can be closed programmatically now that serveDocsSite returns the server", async () => {
    server = await serveDocsSite(makeConfig(docsDir));
    const port = assignedPort();

    await new Promise<void>((resolveClose) =>
      server!.close(() => resolveClose()),
    );

    await expect(fetch(`http://127.0.0.1:${port}/`)).rejects.toThrow();
  });
});
