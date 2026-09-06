import { renderArtifactTag } from "../config/publishing";
import type {
  ResolvedArtifact,
  ResolvedContract,
  VarsTree,
} from "../config/types";

export interface DefaultReadmeArgs {
  contract: ResolvedContract;
  artifact: ResolvedArtifact;
  version: string;
  github: { owner: string; repo: string };
  vars: VarsTree;
}

/**
 * Renders a sensible default `README.md` for a generated SDK package, used
 * whenever the artifact has no custom `readme:` template configured. Covers
 * every built-in `lang`/`kind` combination; anything more specific (house
 * install instructions, extra usage notes) belongs in a custom template
 * instead - see `readme-renderer.ts`. Registry URLs and branch/tag names
 * come from the artifact's resolved `publishing:` config, so a repo that
 * overrides its registry sees that reflected here automatically.
 *
 * @param args - The contract, artifact, version, and github/vars coordinates
 *               to render for.
 * @returns The rendered README content.
 */
export function renderDefaultReadme({
  contract,
  artifact,
  version,
  github,
  vars,
}: DefaultReadmeArgs): string {
  const header = `# ${contract.title} - ${label(artifact)}

> Generated from \`${contract.entrypointRelative}\` in [${github.owner}/${github.repo}](https://github.com/${github.owner}/${github.repo}).
> Do not edit by hand - this package is regenerated and republished on every release.

Version: \`${version}\`
Source branch: \`${artifact.branch}\`
`;

  return `${header}\n${body(contract, artifact, version, github, vars)}\n`;
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
  vars: VarsTree,
): string {
  switch (`${artifact.lang}-${artifact.kind}`) {
    case "typescript-client":
      return tsClient(artifact, version);
    case "typescript-server":
      return tsServer(artifact, version);
    case "go-client":
      return goClient(contract, artifact, github, vars);
    case "go-server":
      return goServer(artifact);
    case "java-client":
      return javaClient(artifact, version);
    case "java-server":
      return javaServer(artifact, version);
    default:
      return "";
  }
}

//</editor-fold>

//<editor-fold desc="README Body Templates" defaultstate="collapsed">

function tsClient(artifact: ResolvedArtifact, version: string): string {
  return `## Install

\`\`\`bash
npm config set <scope>:registry ${artifact.publishing.npmRegistry}
npm install ${artifact.package}@${version}
\`\`\`

(Requires an authenticated \`.npmrc\` with a token for that registry.)

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
npm config set <scope>:registry ${artifact.publishing.npmRegistry}
npm install --save-dev ${artifact.package}@${version}
\`\`\`

(Requires an authenticated \`.npmrc\` with a token for that registry.)

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
  github: { owner: string; repo: string },
  vars: VarsTree,
): string {
  // Illustrative only - renders the tag template with a literal "<version>"
  // placeholder rather than an actual version, since this is documentation
  // text showing the *pattern*, not a specific release.
  const exampleTag = renderArtifactTag(
    artifact,
    contract.name,
    "<version>",
    github,
    vars,
  );

  return `## Install

Go has no package registry, so this module is pulled directly from its
publishing branch:

\`\`\`bash
go get ${artifact.goModule}@${artifact.branch}
\`\`\`

To pin an exact release instead of the branch head, use the matching tag:

\`\`\`bash
go get ${artifact.goModule}@${exampleTag}
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

function goServer(artifact: ResolvedArtifact): string {
  return `## Install

\`\`\`bash
go get ${artifact.goModule}@${artifact.branch}
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

function javaClient(artifact: ResolvedArtifact, version: string): string {
  return `## Install (Maven)

\`\`\`xml
<dependency>
  <groupId>${artifact.maven?.groupId}</groupId>
  <artifactId>${artifact.maven?.artifactId}</artifactId>
  <version>${version}</version>
</dependency>
\`\`\`

Add the repository to your \`settings.xml\` (or \`pom.xml\`) with credentials
for that repository:

\`\`\`xml
<repository>
  <id>${artifact.publishing.mavenRepositoryId}</id>
  <url>${artifact.publishing.mavenRepositoryUrl}</url>
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

function javaServer(artifact: ResolvedArtifact, version: string): string {
  return `## Install (Maven)

\`\`\`xml
<dependency>
  <groupId>${artifact.maven?.groupId}</groupId>
  <artifactId>${artifact.maven?.artifactId}</artifactId>
  <version>${version}</version>
</dependency>
\`\`\`

Add the repository to your \`settings.xml\` (or \`pom.xml\`) with credentials
for that repository:

\`\`\`xml
<repository>
  <id>${artifact.publishing.mavenRepositoryId}</id>
  <url>${artifact.publishing.mavenRepositoryUrl}</url>
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
