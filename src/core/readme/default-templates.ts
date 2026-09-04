import type { ResolvedArtifact, ResolvedContract } from "@config/types";

export interface DefaultReadmeArgs {
  contract: ResolvedContract;
  artifact: ResolvedArtifact;
  version: string;
  github: { owner: string; repo: string };
}

/**
 * Renders a sensible default `README.md` for a generated SDK package, used
 * whenever the artifact has no custom `readme:` template configured. Covers
 * every built-in `lang`/`kind` combination; anything more specific (an internal
 * registry URL, a real base API URL, house install instructions) belongs in a
 * custom template instead - see `readme-renderer.ts`.
 *
 * @param args - The contract, artifact, version, and github coordinates to
 *               render for.
 * @returns The rendered README content.
 */
export function renderDefaultReadme({
  contract,
  artifact,
  version,
  github,
}: DefaultReadmeArgs): string {
  const header = `# ${contract.title} - ${label(artifact)}

> Generated from \`${contract.entrypointRelative}\` in [${github.owner}/${github.repo}](https://github.com/${github.owner}/${github.repo}).
> Do not edit by hand - this package is regenerated and republished on every release.

Version: \`${version}\`
Source branch: \`${artifact.branch}\`
`;

  return `${header}\n${body(contract, artifact, version, github)}\n`;
}

//<editor-fold desc="README Template Helpers" defaultstate="collapsed">

function label(artifact: ResolvedArtifact): string {
  const lang = { typescript: "TypeScript", go: "Go", java: "Java" }[
    artifact.lang
  ];
  const kind =
    artifact.kind === "client"
      ? "Client SDK"
      : artifact.lang === "typescript"
        ? "Server Types"
        : "Server Stubs";

  return `${lang} ${kind}`;
}

function body(
  contract: ResolvedContract,
  artifact: ResolvedArtifact,
  version: string,
  github: { owner: string; repo: string },
): string {
  switch (`${artifact.lang}-${artifact.kind}`) {
    case "typescript-client":
      return tsClient(artifact, version);
    case "typescript-server":
      return tsServer(artifact, version);
    case "go-client":
      return goClient(contract, artifact);
    case "go-server":
      return goServer(contract, artifact);
    case "java-client":
      return javaClient(artifact, version, github);
    case "java-server":
      return javaServer(artifact, version, github);
    default:
      return "";
  }
}

//</editor-fold>

//<editor-fold desc="README Body Templates" defaultstate="collapsed">

function tsClient(artifact: ResolvedArtifact, version: string): string {
  return `## Install

\`\`\`bash
npm config set <scope>:registry https://npm.pkg.github.com
npm install ${artifact.package}@${version}
\`\`\`

(GitHub Packages requires an authenticated \`.npmrc\` with a token that has
\`read:packages\`.)

## Usage

\`\`\`ts
import { Configuration, DefaultApi } from "${artifact.package}";

const api = new DefaultApi(
  new Configuration({ basePath: "https://api.your-domain.com" }),
);

const result = await api.someOperation();
\`\`\`
`;
}

function tsServer(artifact: ResolvedArtifact, version: string): string {
  return `## Install

\`\`\`bash
npm config set <scope>:registry https://npm.pkg.github.com
npm install --save-dev ${artifact.package}@${version}
\`\`\`

(GitHub Packages requires an authenticated \`.npmrc\` with a token that has
\`read:packages\`.)

## Usage

\`\`\`ts
import type { components, operations } from "${artifact.package}";

type LoginResponses = operations["login"]["responses"];

// Example: an Express handler typed against the contract
app.post("/login", (req, res) => {
  const body = req.body as components["schemas"]["LoginRequest"];
  const response: LoginResponses[200]["content"]["application/json"] = {
    // ...
  };
  res.json(response);
});
\`\`\`
`;
}

function goClient(
  contract: ResolvedContract,
  artifact: ResolvedArtifact,
): string {
  return `## Install

Go has no package registry, so this module is pulled directly from its
publishing branch:

\`\`\`bash
go get ${artifact.goModule}@sdk/svc-${contract.name}/${artifact.id}
\`\`\`

To pin an exact release instead of the branch head, use the matching tag:

\`\`\`bash
go get ${artifact.goModule}@${artifact.tagPrefix}-v<version>
\`\`\`

## Usage

\`\`\`go
import (
    "context"

    ${artifact.goPackageName} "${artifact.goModule}"
)

func main() {
    cfg := ${artifact.goPackageName}.NewConfiguration()
    client := ${artifact.goPackageName}.NewAPIClient(cfg)

    resp, _, err := client.DefaultAPI.SomeOperation(context.Background()).Execute()
    _ = resp
    _ = err
}
\`\`\`
`;
}

function goServer(
  contract: ResolvedContract,
  artifact: ResolvedArtifact,
): string {
  return `## Install

\`\`\`bash
go get ${artifact.goModule}@sdk/svc-${contract.name}/${artifact.id}
\`\`\`

## Usage

Implement the generated \`${artifact.goPackageName}.*ApiServicer\` interfaces and
wire them into the generated router:

\`\`\`go
router := ${artifact.goPackageName}.NewRouter(
    ${artifact.goPackageName}.NewSomeApiController(yourServiceImpl),
)
\`\`\`
`;
}

function javaClient(
  artifact: ResolvedArtifact,
  version: string,
  github: { owner: string; repo: string },
): string {
  return `## Install (Maven, GitHub Packages)

\`\`\`xml
<dependency>
  <groupId>${artifact.maven?.groupId}</groupId>
  <artifactId>${artifact.maven?.artifactId}</artifactId>
  <version>${version}</version>
</dependency>
\`\`\`

Add the repository to your \`settings.xml\` (or \`pom.xml\`) with a token that
has \`read:packages\`:

\`\`\`xml
<repository>
  <id>github</id>
  <url>https://maven.pkg.github.com/${github.owner}/${github.repo}</url>
</repository>
\`\`\`

## Usage

Generated with \`library=restclient\` - Spring's \`RestClient\`, the current
recommended synchronous HTTP client for Spring apps:

\`\`\`java
@Configuration
public class SomeServiceClientConfig {

    @Bean
    public ApiClient someServiceApiClient(RestClient.Builder builder) {
        ApiClient client = new ApiClient(builder.build());
        client.setBasePath("https://api.your-domain.com");
        return client;
    }

    @Bean
    public DefaultApi someServiceApi(ApiClient someServiceApiClient) {
        return new DefaultApi(someServiceApiClient);
    }
}
\`\`\`
`;
}

function javaServer(
  artifact: ResolvedArtifact,
  version: string,
  github: { owner: string; repo: string },
): string {
  return `## Install (Maven, GitHub Packages)

\`\`\`xml
<dependency>
  <groupId>${artifact.maven?.groupId}</groupId>
  <artifactId>${artifact.maven?.artifactId}</artifactId>
  <version>${version}</version>
</dependency>
\`\`\`

Add the repository to your \`settings.xml\` (or \`pom.xml\`) with a token that
has \`read:packages\`:

\`\`\`xml
<repository>
  <id>github</id>
  <url>https://maven.pkg.github.com/${github.owner}/${github.repo}</url>
</repository>
\`\`\`

## Usage

This artifact only contains the generated Spring \`@RestController\` interfaces
(\`interfaceOnly=true\`) - implement them in your service:

\`\`\`java
@RestController
public class SomeController implements SomeApi {
    // interface methods generated from the OpenAPI contract
}
\`\`\`
`;
}

//</editor-fold>
