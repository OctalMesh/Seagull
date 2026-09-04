import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  git,
  readFileAtTag,
  remoteBranchExists,
  requireOk,
  tagExists,
} from "@core/git/git";

import type { ResolvedConfig } from "@config/types";

export interface PublishSdkOptions {
  dryRun?: boolean;
}

/**
 * Redistributes each generated artifact's `dist/sdk/<contract>/<artifact-id>`
 * into its own orphan branch (`sdk/svc-<contract>/<artifact-id>`) and tags the
 * publish.
 *
 * @param config  - The resolved CLI config.
 * @param options - `{ dryRun }` - skip pushing, just report what would happen.
 */
export async function publishSdkCommand(
  config: ResolvedConfig,
  options: PublishSdkOptions = {},
): Promise<void> {
  const dryRun = options.dryRun ?? false;

  for (const { contract, artifact } of config.allArtifacts) {
    const version = (
      await readFile(path.join(artifact.outputDir, "VERSION"), "utf8")
    ).trim();
    const localHash = (
      await readFile(path.join(artifact.outputDir, "SPEC_HASH"), "utf8")
    ).trim();
    const tag = `${artifact.tagPrefix}-v${version}`;

    console.log(
      `\n=== ${contract.name} / ${artifact.id} -> ${artifact.branch} (v${version}) ===`,
    );

    if (tagExists(config.rootDir, tag)) {
      const remoteHash = readFileAtTag(config.rootDir, tag, "SPEC_HASH");

      if (remoteHash !== null && remoteHash !== localHash) {
        throw new Error(
          `Tag ${tag} already exists, but the ${contract.name} spec content ` +
            `has changed since it was published under that version. Bump ` +
            `"info.version" in ${contract.entrypointRelative} before ` +
            `releasing again.`,
        );
      }

      console.log(
        `Tag ${tag} already exists on origin with matching content, skipping (already published).`,
      );
      continue;
    }

    const worktreeDir = await mkdtemp(path.join(tmpdir(), "sdk-publish-"));
    await rm(worktreeDir, { recursive: true, force: true });

    git(["fetch", "origin", artifact.branch], config.rootDir);
    const hasRemoteBranch = remoteBranchExists(config.rootDir, artifact.branch);

    const setup = hasRemoteBranch
      ? git(
          ["worktree", "add", worktreeDir, `origin/${artifact.branch}`],
          config.rootDir,
        )
      : git(["worktree", "add", "--detach", worktreeDir], config.rootDir);
    requireOk(setup, `Failed to create worktree for ${artifact.branch}`);

    if (hasRemoteBranch) {
      requireOk(
        git(
          ["checkout", "-B", artifact.branch, `origin/${artifact.branch}`],
          worktreeDir,
        ),
        `Failed to check out ${artifact.branch}`,
      );
    } else {
      requireOk(
        git(["checkout", "--orphan", artifact.branch], worktreeDir),
        `Failed to create orphan branch ${artifact.branch}`,
      );
    }

    git(["rm", "-rf", "--quiet", "."], worktreeDir);
    await cp(artifact.outputDir, worktreeDir, { recursive: true });

    git(["add", "-A"], worktreeDir);
    const hasChanges =
      git(["diff", "--cached", "--quiet"], worktreeDir).status !== 0;

    if (!hasChanges) {
      console.log(
        "No content changes since last publish - committing tag only.",
      );
    } else {
      requireOk(
        git(
          [
            "commit",
            "-m",
            `chore(sdk): publish ${contract.name} ${artifact.id} v${version}`,
          ],
          worktreeDir,
        ),
        `Commit failed for ${artifact.branch}`,
      );
    }

    requireOk(git(["tag", tag], worktreeDir), `Tagging failed for ${tag}`);

    if (dryRun) {
      console.log(`[dry-run] would push ${artifact.branch} and tag ${tag}`);
    } else {
      requireOk(
        git(
          ["push", "origin", `HEAD:refs/heads/${artifact.branch}`],
          worktreeDir,
        ),
        `Push failed for ${artifact.branch}`,
      );
      requireOk(
        git(["push", "origin", tag], worktreeDir),
        `Tag push failed for ${tag}`,
      );
      console.log(`Published ${artifact.branch} @ ${tag}`);
    }

    git(["worktree", "remove", "--force", worktreeDir], config.rootDir);
  }

  console.log(`\nDone - processed ${config.allArtifacts.length} SDK packages.`);
}
