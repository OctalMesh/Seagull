import { readFile } from "node:fs/promises";

import { renderArtifactTag } from "../config/publishing";
import { buildTemplateContext, interpolate } from "../config/template";
import type {
  ResolvedArtifact,
  ResolvedContract,
  VarsTree,
} from "../config/types";
import { renderDefaultReadme } from "./default-templates";

export interface RenderReadmeArgs {
  contract: ResolvedContract;
  artifact: ResolvedArtifact;
  version: string;
  github: { owner: string; repo: string };
  vars: VarsTree;
}

/**
 * Renders the root-level `README.md` for a generated SDK package.
 *
 * If the artifact has a `readme:` path configured (resolved at config-load time
 * to `artifact.readmeTemplate`), that file is read and interpolated with the
 * same `{...}` placeholder engine naming templates use - `{service}`,
 * `{title}`, `{version}`, `{vars.*}`, `{github.owner}`, `{github.repo}`, plus
 * `{artifact.*}` (id/lang/kind/package/goModule/goPackageName/maven.groupId/
 * maven.artifactId/branch/tag/npmRegistry/mavenRepositoryUrl). Otherwise,
 * falls back to a built-in default template for the artifact's language/kind.
 *
 * @param args - The contract, artifact, version, and github/vars context to
 *               render for.
 * @returns The rendered README content.
 */
export async function renderReadme(args: RenderReadmeArgs): Promise<string> {
  if (!args.artifact.readmeTemplate) {
    return renderDefaultReadme(args);
  }

  const raw = await readFile(args.artifact.readmeTemplate, "utf8");
  const context = buildTemplateContext({
    service: args.contract.name,
    title: args.contract.title,
    version: args.version,
    github: args.github,
    vars: args.vars,
    artifact: {
      id: args.artifact.id,
      lang: args.artifact.lang,
      kind: args.artifact.kind,
      package: args.artifact.package,
      goModule: args.artifact.goModule,
      goPackageName: args.artifact.goPackageName,
      maven: args.artifact.maven,
      branch: args.artifact.branch,
      tag: renderArtifactTag(
        args.artifact,
        args.contract.name,
        args.version,
        args.github,
        args.vars,
      ),
      npmRegistry: args.artifact.publishing.npmRegistry,
      mavenRepositoryUrl: args.artifact.publishing.mavenRepositoryUrl,
    },
  });

  return interpolate(raw, context);
}
