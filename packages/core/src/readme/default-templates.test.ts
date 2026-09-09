import { describe, expect, it } from "vitest";

import { GITHUB, makeArtifact, makeContract } from "../test-support/fixtures";
import { renderDefaultReadme } from "./default-templates";

describe("renderDefaultReadme", () => {
  it("renders a common header with title, source, version, and branch", () => {
    const contract = makeContract();
    const artifact = makeArtifact();

    const readme = renderDefaultReadme({
      contract,
      artifact,
      version: "1.2.3",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain("# Auth Service API - TypeScript Client SDK");
    expect(readme).toContain(
      "> Generated from `specs/auth/openapi.yaml` in [OctalMesh/ows-contracts](https://github.com/OctalMesh/ows-contracts).",
    );
    expect(readme).toContain("Version: `1.2.3`");
    expect(readme).toContain("Source branch: `sdk/svc-auth/ts-client`");
  });

  it.each([
    ["typescript", "client", "TypeScript Client SDK"],
    ["typescript", "server", "TypeScript Server Types"],
    ["go", "client", "Go Client SDK"],
    ["go", "server", "Go Server Stubs"],
    ["java", "client", "Java Client SDK"],
    ["java", "server", "Java Server Stubs"],
  ] as const)("labels %s/%s as '%s'", (lang, kind, label) => {
    const artifact = makeArtifact({
      lang,
      kind,
      package: lang === "typescript" ? "@org/pkg" : undefined,
      goModule: lang === "go" ? "github.com/org/repo" : undefined,
      goPackageName: lang === "go" ? "authclient" : undefined,
      maven:
        lang === "java"
          ? { groupId: "com.org.auth", artifactId: "auth-client" }
          : undefined,
    });

    const readme = renderDefaultReadme({
      contract: makeContract(),
      artifact,
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain(`- ${label}`);
  });

  it("typescript-client body includes npm install/usage instructions", () => {
    const readme = renderDefaultReadme({
      contract: makeContract(),
      artifact: makeArtifact({
        lang: "typescript",
        kind: "client",
        package: "@octalmesh/auth-client",
      }),
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain("npm install @octalmesh/auth-client@1.0.0");
    expect(readme).toContain(
      'import { Configuration, DefaultApi } from "@octalmesh/auth-client";',
    );
  });

  it("typescript-server body includes types-only usage, not a client import", () => {
    const readme = renderDefaultReadme({
      contract: makeContract(),
      artifact: makeArtifact({
        lang: "typescript",
        kind: "server",
        package: "@octalmesh/auth-server",
      }),
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain(
      'import type { components, operations } from "@octalmesh/auth-server";',
    );
    expect(readme).not.toContain("Configuration, DefaultApi");
  });

  it("go-client body renders an example tag using the artifact's own tag template", () => {
    const readme = renderDefaultReadme({
      contract: makeContract(),
      artifact: makeArtifact({
        id: "go-client",
        lang: "go",
        kind: "client",
        package: undefined,
        goModule: "github.com/octalmesh/ows-contracts",
        goPackageName: "authclient",
        branch: "sdk/svc-auth/go-client",
        publishing: {
          branch: "sdk/svc-auth/go-client",
          tagTemplate: "svc-{service}-{id}-v{version}",
          repositoryUrl: "https://github.com/OctalMesh/ows-contracts",
          npmRegistry: "https://npm.pkg.github.com",
          npmAccess: "public",
          mavenRepositoryId: "github",
          mavenRepositoryUrl:
            "https://maven.pkg.github.com/OctalMesh/ows-contracts",
        },
      }),
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain(
      "go get github.com/octalmesh/ows-contracts@sdk/svc-auth/go-client",
    );
    expect(readme).toContain(
      "go get github.com/octalmesh/ows-contracts@svc-auth-go-client-v<version>",
    );
  });

  it("go-server body has no install-by-tag example, just go get + router wiring", () => {
    const readme = renderDefaultReadme({
      contract: makeContract(),
      artifact: makeArtifact({
        lang: "go",
        kind: "server",
        package: undefined,
        goModule: "github.com/octalmesh/ows-contracts",
        goPackageName: "authserver",
      }),
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain("authserver.NewRouter(");
  });

  it("java-client body renders Maven coordinates and a RestClient usage example", () => {
    const readme = renderDefaultReadme({
      contract: makeContract(),
      artifact: makeArtifact({
        lang: "java",
        kind: "client",
        package: undefined,
        maven: { groupId: "com.octalmesh.auth", artifactId: "auth-client" },
      }),
      version: "2.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain("<groupId>com.octalmesh.auth</groupId>");
    expect(readme).toContain("<artifactId>auth-client</artifactId>");
    expect(readme).toContain("<version>2.0.0</version>");
    expect(readme).toContain("<id>github</id>");
    expect(readme).toContain("RestClient");
  });

  it("java-server body notes interfaceOnly generation, not a usable client", () => {
    const readme = renderDefaultReadme({
      contract: makeContract(),
      artifact: makeArtifact({
        lang: "java",
        kind: "server",
        package: undefined,
        maven: { groupId: "com.octalmesh.auth", artifactId: "auth-server" },
      }),
      version: "1.0.0",
      github: GITHUB,
      vars: {},
    });

    expect(readme).toContain("interfaceOnly=true");
    expect(readme).toContain("implements SomeApi");
  });
});
