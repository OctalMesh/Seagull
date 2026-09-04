import { spawnSync } from "node:child_process";

/**
 * The result of executing a git command.
 *
 * @see {@link git} - The function that executes the git command.
 */
export interface GitResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute a git command in a given working directory and return the result.
 *
 * @param args - The command-line arguments to pass to the git command.
 * @param cwd  - The working directory in which to execute the git command.
 * @returns The result of the git command.
 *
 * @see {@link GitResult} - The result of executing the git command.
 */
export function git(args: string[], cwd: string): GitResult {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });

  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

/**
 * Check if a remote branch exists in the given repository.
 *
 * @param repoRoot - The root directory of the repository.
 * @param branch   - The name of the branch to check.
 * @returns Whether the remote branch exists (true) or not (false).
 */
export function remoteBranchExists(repoRoot: string, branch: string): boolean {
  return (
    git(["ls-remote", "--exit-code", "--heads", "origin", branch], repoRoot)
      .status === 0
  );
}

/**
 * Check if a remote tag exists in the given repository.
 *
 * @param repoRoot - The root directory of the repository.
 * @param tag      - The name of the tag to check.
 * @returns Whether the remote tag exists (true) or not (false).
 */
export function tagExists(repoRoot: string, tag: string): boolean {
  return (
    git(["ls-remote", "--exit-code", "--tags", "origin", tag], repoRoot)
      .status === 0
  );
}

/**
 * Fetch a single tag's object from origin into the local repo, without
 * fetching the rest of history/tags.
 *
 * @param repoRoot - The root directory of the repository.
 * @param tag      - The name of the tag to fetch.
 * @returns The result of the underlying `git fetch` command.
 */
function fetchTag(repoRoot: string, tag: string): GitResult {
  return git(
    ["fetch", "origin", `refs/tags/${tag}:refs/tags/${tag}`, "--force"],
    repoRoot,
  );
}

/**
 * Read a single file's content as it existed at a given git tag, without
 * checking out a worktree.
 *
 * Returns `null` (rather than throwing) both when the tag can't be fetched and
 * when the tag exists but doesn't contain the requested file - the latter is
 * expected for tags published before that file was introduced, and callers
 * should treat "unknown" the same as "no mismatch to report".
 *
 * @param repoRoot - The root directory of the repository.
 * @param tag      - The tag to read the file from.
 * @param filePath - The path of the file within that tag's tree.
 * @returns The file's content, or `null` if it couldn't be read.
 */
export function readFileAtTag(
  repoRoot: string,
  tag: string,
  filePath: string,
): string | null {
  const fetch = fetchTag(repoRoot, tag);

  if (fetch.status !== 0) {
    return null;
  }

  const show = git(["show", `${tag}:${filePath}`], repoRoot);

  return show.status === 0 ? show.stdout.trim() : null;
}

/**
 * Require that a git command succeeded, throwing an error with the given
 * message if it did not.
 *
 * @param result  - The result of the git command to check.
 * @param message - The error message to throw if the command failed.
 * @throws Error if the git command failed (non-zero exit code).
 */
export function requireOk(result: GitResult, message: string): void {
  if (result.status !== 0) {
    throw new Error(`${message}: ${result.stderr || result.stdout}`);
  }
}
