import { describe, expect, it, vi } from "vitest";

import { makeConfig } from "../test-support/fixtures";

const generateDocsSiteMock = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("@octalmesh/seagull-docs", () => ({
  generateDocsSite: (...a: unknown[]) => generateDocsSiteMock(...a),
}));

const { generateDocsCommand } = await import("./generate-docs");

describe("generateDocsCommand", () => {
  it("delegates straight to generateDocsSite with the resolved config", async () => {
    const config = makeConfig("/repo");

    await generateDocsCommand(config);

    expect(generateDocsSiteMock).toHaveBeenCalledTimes(1);
    expect(generateDocsSiteMock).toHaveBeenCalledWith(config);
  });

  it("propagates errors from generateDocsSite", async () => {
    generateDocsSiteMock.mockRejectedValueOnce(new Error("boom"));

    await expect(generateDocsCommand(makeConfig("/repo"))).rejects.toThrow(
      "boom",
    );
  });
});
