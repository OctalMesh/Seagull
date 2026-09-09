import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GITHUB, makeArtifact, makeContract } from "../test-support/fixtures";
import { renderReadme } from "./readme-renderer";

describe("renderReadme", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "seagull-readme-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("falls back to the built-in default template when no readmeTemplate is set", async () => {
    const readme = await renderReadme({
      contract: makeContract(),
      artifact: makeArtifact({ readmeTemplate: undefined }),
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain("# Auth Service API - TypeScript Client SDK");
  });

  it("reads and interpolates a custom readmeTemplate file when set", async () => {
    const templatePath = path.join(dir, "custom-readme.md");

    await writeFile(
      templatePath,
      [
        "# {title} - custom",
        "",
        "Install `{artifact.package}@{version}` from {artifact.npmRegistry}.",
        "Branch: {artifact.branch}, tag: {artifact.tag}.",
        "Org: {vars.org}, repo: {github.owner}/{github.repo}.",
      ].join("\n"),
    );

    const readme = await renderReadme({
      contract: makeContract({ title: "Auth Service API" }),
      artifact: makeArtifact({ readmeTemplate: templatePath }),
      version: "1.2.3",
      github: GITHUB,
      vars: { org: "octalmesh" },
    });

    expect(readme).toBe(
      [
        "# Auth Service API - custom",
        "",
        "Install `@octalmesh/auth-client@1.2.3` from https://npm.pkg.github.com.",
        "Branch: sdk/svc-auth/ts-client, tag: svc-auth-ts-client-v1.2.3.",
        "Org: octalmesh, repo: OctalMesh/ows-contracts.",
      ].join("\n"),
    );
  });

  it("exposes artifact.id/lang/kind and maven coordinates to the custom template", async () => {
    const templatePath = path.join(dir, "java-readme.md");

    await writeFile(
      templatePath,
      "{artifact.id} / {artifact.lang} / {artifact.kind} - {artifact.maven.groupId}:{artifact.maven.artifactId}",
    );

    const readme = await renderReadme({
      contract: makeContract(),
      artifact: makeArtifact({
        id: "java-client",
        lang: "java",
        kind: "client",
        package: undefined,
        maven: { groupId: "com.octalmesh.auth", artifactId: "auth-client" },
        readmeTemplate: templatePath,
      }),
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toBe(
      "java-client / java / client - com.octalmesh.auth:auth-client",
    );
  });

  it("throws when the custom template references an unknown placeholder", async () => {
    const templatePath = path.join(dir, "broken.md");

    await writeFile(templatePath, "{artifact.doesNotExist}");

    await expect(
      renderReadme({
        contract: makeContract(),
        artifact: makeArtifact({ readmeTemplate: templatePath }),
        version: "1.0.0",
        github: GITHUB,
        vars: {},
      }),
    ).rejects.toThrow(/Unknown template placeholder/);
  });

  it("rejects when the custom template file doesn't exist", async () => {
    await expect(
      renderReadme({
        contract: makeContract(),
        artifact: makeArtifact({
          readmeTemplate: path.join(dir, "missing.md"),
        }),
        version: "1.0.0",
        github: GITHUB,
        vars: {},
      }),
    ).rejects.toThrow();
  });
});
