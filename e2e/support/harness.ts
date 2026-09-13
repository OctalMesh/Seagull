import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repo root (parent of `e2e/`). */
export const REPO_ROOT = path.resolve(HERE, "..", "..");

/** Absolute path to the built CLI entrypoint that `pnpm build` produces. */
export const CLI_ENTRY = path.join(REPO_ROOT, "dist", "cli.mjs");

/** Absolute path to the checked-in fixture contracts repo. */
export const FIXTURE_SOURCE = path.join(
  REPO_ROOT,
  "e2e",
  "fixtures",
  "contracts-fixture",
);

export interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs the real, built Seagull CLI (`dist/cli.mjs`) as a child process with the
 * given args and cwd, capturing output.
 *
 * @param args - The CLI args to pass.
 * @param cwd  - The working directory to run the CLI in.
 * @returns The exit status and captured stdout/stderr of the CLI process.
 * @throws Error if `dist/cli.mjs` doesn't exist - build first.
 */
export function runCli(args: string[], cwd: string): CliResult {
  if (!existsSync(CLI_ENTRY)) {
    throw new Error(
      `${CLI_ENTRY} doesn't exist - build the project first before running the e2e suite`,
    );
  }

  const result = spawnSync("node", [CLI_ENTRY, ...args], {
    cwd,
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Copies the fixture contracts repo into a fresh temp directory, so each test
 * gets an isolated, disposable copy to run `dist/` output and git operations
 * against without mutating the checked-in fixture or clashing with other tests.
 *
 * @param prefix - A string to include in the temp dir name, for debugging.
 * @returns The absolute path to the copied fixture directory.
 */
export async function copyFixture(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), `seagull-e2e-${prefix}-`));

  await cp(FIXTURE_SOURCE, dir, { recursive: true });

  return dir;
}

/**
 * Initializes `dir` as a git repo with a real local bare repo as its `origin`
 * remote, so `publish sdk` can be exercised against real git plumbing without
 * touching any actual network/GitHub remote.
 *
 * @param dir - The working directory to initialize as a git repo.
 * @returns The absolute path to the bare `origin` repo.
 */
export async function initGitOrigin(dir: string): Promise<string> {
  const originDir = await mkdtemp(path.join(tmpdir(), "seagull-e2e-origin-"));

  run("git", ["init", "--bare", "--quiet", originDir]);
  run("git", ["init", "--quiet", "."], dir);
  run("git", ["config", "user.email", "seagull-e2e@example.com"], dir);
  run("git", ["config", "user.name", "Seagull E2E"], dir);
  run("git", ["remote", "add", "origin", originDir], dir);
  run("git", ["add", "-A"], dir);
  run("git", ["commit", "--quiet", "-m", "e2e fixture: initial commit"], dir);

  return originDir;
}

/**
 * Runs a plain command and throws on failure.
 *
 * @param command - The command to run (e.g. "git").
 * @param args    - The arguments to pass to the command.
 * @param cwd     - The working directory to run the command in.
 *                  (Defaults to `REPO_ROOT`.)
 * @returns The trimmed stdout of the command.
 * @throws Error if the command exits with a non-zero status.
 */
export function run(command: string, args: string[], cwd?: string): string {
  const result = spawnSync(command, args, {
    cwd: cwd ?? REPO_ROOT,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}:\n${result.stderr}`,
    );
  }

  return (result.stdout ?? "").trim();
}

/**
 * Lists the ref names (branches or tags) that exist in a bare git repo.
 *
 * @param bareRepoDir - The directory of the bare git repo.
 * @param kind        - The type of refs to list (heads or tags).
 * @returns An array of ref names.
 */
export function listRefs(
  bareRepoDir: string,
  kind: "heads" | "tags",
): string[] {
  const output = run(
    "git",
    ["for-each-ref", `refs/${kind}/`, "--format=%(refname:short)"],
    bareRepoDir,
  );

  return output.split("\n").filter(Boolean);
}

/**
 * Checks whether the given URL is reachable from this environment.
 * Used to determine if network-dependent tests can run, e.g. downloading
 * dependencies from Maven Central or npm registries.
 *
 * @param url - The URL to check.
 * @returns True if the URL is reachable (HTTP 2xx/3xx), false otherwise.
 */
export async function canReach(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Reads and JSON-parses a file relative to `dir`.
 *
 * @param dir      - The directory to read the file from.
 * @param segments - The path segments to the file.
 * @returns A promise resolving to the parsed JSON.
 */
export async function readJson<T>(
  dir: string,
  ...segments: string[]
): Promise<T> {
  const content = await readFile(path.join(dir, ...segments), "utf8");

  return JSON.parse(content) as T;
}
