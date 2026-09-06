import { buildTemplateContext, interpolate } from "./template";
import type { ResolvedArtifact, VarsTree } from "./types";

/**
 * Renders an artifact's final git tag from its `publishing.tagTemplate` -
 * the one piece of `publishing:` config that can't be resolved at config-load
 * time, since it needs the artifact's version, which is only known once the
 * contract's spec has been bundled.
 *
 * @param artifact     - The resolved artifact (for `id` and
 *                       `publishing.tagTemplate`).
 * @param contractName - The owning contract's name, exposed to the template as
 *                       `{service}`.
 * @param version      - The resolved SDK version, exposed to the template as
 *                       `{version}`.
 * @param github       - `{ owner, repo }`, exposed as `{github.owner}`/
 *                       `{github.repo}`.
 * @param vars         - The config's `vars:` tree, exposed as `{vars.*}`.
 * @returns The rendered tag name.
 */
export function renderArtifactTag(
  artifact: ResolvedArtifact,
  contractName: string,
  version: string,
  github: { owner: string; repo: string },
  vars: VarsTree,
): string {
  const context = buildTemplateContext({
    service: contractName,
    id: artifact.id,
    version,
    github,
    vars,
  });

  return interpolate(artifact.publishing.tagTemplate, context);
}
