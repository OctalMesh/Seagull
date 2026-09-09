import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CONFIG_FILENAMES, resolveConfigPath } from "./resolve-config-file";

describe("resolveConfigPath", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-resolve-config-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("throws with the full candidate list when no config file exists", () => {
    expect(() => resolveConfigPath(dir)).toThrow(
      new RegExp(
        `No CLI config found in ${dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
    );

    for (const filename of CONFIG_FILENAMES) {
      expect(() => resolveConfigPath(dir)).toThrow(
        new RegExp(filename.replace(".", "\\.")),
      );
    }
  });

  it("finds 'seagull.yaml' when present", async () => {
    await writeFile(path.join(dir, "seagull.yaml"), "configVersion: 1");

    expect(resolveConfigPath(dir)).toBe(path.join(dir, "seagull.yaml"));
  });

  it("prefers earlier filenames in CONFIG_FILENAMES order over later ones", async () => {
    await writeFile(path.join(dir, ".seagull"), "configVersion: 1");
    await writeFile(path.join(dir, "seagull.yaml"), "configVersion: 1");

    expect(resolveConfigPath(dir)).toBe(path.join(dir, ".seagull"));
  });

  it("falls through to a later candidate when earlier ones are absent", async () => {
    await writeFile(path.join(dir, "seagull.yml"), "configVersion: 1");

    expect(resolveConfigPath(dir)).toBe(path.join(dir, "seagull.yml"));
  });

  it("returns an absolute path", async () => {
    await writeFile(path.join(dir, ".seagull.yaml"), "configVersion: 1");

    const resolved = resolveConfigPath(dir);

    expect(path.isAbsolute(resolved)).toBe(true);
  });
});
