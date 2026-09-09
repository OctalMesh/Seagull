import { describe, expect, it } from "vitest";

import { renderArtifactTag } from "./publishing";
import type { ResolvedArtifact } from "./types";

function makeArtifact(
  overrides: Partial<ResolvedArtifact> = {},
): ResolvedArtifact {
  return {
    id: "ts-client",
    tool: "openapi-generator",
    lang: "typescript",
    kind: "client",
    outputDir: "/tmp/out",
    branch: "sdk/svc-auth/ts-client",
    publishing: {
      branch: "sdk/svc-auth/ts-client",
      tagTemplate: "svc-{service}-{id}-v{version}",
      repositoryUrl: "https://github.com/OctalMesh/ows-contracts",
      npmRegistry: "https://npm.pkg.github.com",
      npmAccess: "public",
      mavenRepositoryId: "github",
      mavenRepositoryUrl:
        "https://maven.pkg.github.com/OctalMesh/ows-contracts",
    },
    additionalProperties: {},
    ...overrides,
  };
}

describe("renderArtifactTag", () => {
  it("renders {service}, {id}, and {version} into the tag template", () => {
    const tag = renderArtifactTag(
      makeArtifact(),
      "auth",
      "1.2.3",
      { owner: "OctalMesh", repo: "ows-contracts" },
      {},
    );

    expect(tag).toBe("svc-auth-ts-client-v1.2.3");
  });

  it("supports {github.*} and {vars.*} placeholders in the tag template", () => {
    const artifact = makeArtifact({
      publishing: {
        ...makeArtifact().publishing,
        tagTemplate: "{vars.org}-{github.repo}-{service}-{id}-v{version}",
      },
    });

    const tag = renderArtifactTag(
      artifact,
      "catalog",
      "0.4.0",
      { owner: "OctalMesh", repo: "ows-contracts" },
      { org: "octalmesh" },
    );

    expect(tag).toBe("octalmesh-ows-contracts-catalog-ts-client-v0.4.0");
  });

  it("throws when the tag template references an unresolvable placeholder", () => {
    const artifact = makeArtifact({
      publishing: {
        ...makeArtifact().publishing,
        tagTemplate: "{vars.missing}-v{version}",
      },
    });

    expect(() =>
      renderArtifactTag(
        artifact,
        "auth",
        "1.0.0",
        { owner: "OctalMesh", repo: "ows-contracts" },
        {},
      ),
    ).toThrow(/Unknown template placeholder/);
  });

  it("throws a descriptive error when the resolved tag would start with '-'", () => {
    const artifact = makeArtifact({
      publishing: {
        ...makeArtifact().publishing,
        tagTemplate: "-{vars.opt}",
      },
    });

    expect(() =>
      renderArtifactTag(
        artifact,
        "auth",
        "1.0.0",
        { owner: "OctalMesh", repo: "ows-contracts" },
        { opt: "upload-pack=evil.sh" },
      ),
    ).toThrow(
      /Invalid git publishing\.tag for artifact "auth\/ts-client" "-upload-pack=evil\.sh": must not start with "-"/,
    );
  });

  it("uses the artifact's own id, not its branch, for {id}", () => {
    const artifact = makeArtifact({ id: "go-client" });

    const tag = renderArtifactTag(
      artifact,
      "auth",
      "1.0.0",
      { owner: "OctalMesh", repo: "ows-contracts" },
      {},
    );

    expect(tag).toBe("svc-auth-go-client-v1.0.0");
  });
});
