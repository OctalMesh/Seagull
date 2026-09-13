import { describe, expect, it, vi } from "vitest";

import { makeConfig } from "../test-support/fixtures";

const serveDocsSiteMock = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("@octalmesh/seagull-docs", () => ({
  serveDocsSite: (...a: unknown[]) => serveDocsSiteMock(...a),
}));

const { serveDocsCommand } = await import("./serve-docs");

describe("serveDocsCommand", () => {
  it("delegates straight to serveDocsSite with the resolved config", async () => {
    const config = makeConfig("/repo");

    await serveDocsCommand(config);

    expect(serveDocsSiteMock).toHaveBeenCalledTimes(1);
    expect(serveDocsSiteMock).toHaveBeenCalledWith(config);
  });

  it("propagates errors from serveDocsSite", async () => {
    serveDocsSiteMock.mockRejectedValueOnce(new Error("port in use"));

    await expect(serveDocsCommand(makeConfig("/repo"))).rejects.toThrow(
      "port in use",
    );
  });
});
