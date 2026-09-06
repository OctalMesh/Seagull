import { spawn, spawnSync } from "node:child_process";

/**
 * Runs a command to completion, streaming its stdio straight through
 * (`inherit`), and rejects if it exits non-zero.
 *
 * This is the async counterpart used for the "one long-running tool" commands
 * (`redocly`, `openapi-generator-cli`, `openapi-typescript`); for short
 * synchronous calls (git plumbing, `npm publish`/`mvn deploy`), see
 * {@link runSync}.
 *
 * @param command - The executable to run.
 * @param args    - Arguments to pass to it.
 * @param cwd     - The working directory to run it in.
 * @returns A promise that resolves on exit code 0, and rejects otherwise.
 */
export function run(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: true });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

/**
 * Runs a command to completion synchronously, streaming its stdio straight
 * through (`inherit`).
 *
 * @param command - The executable to run.
 * @param args    - Arguments to pass to it.
 * @param cwd     - The working directory to run it in.
 * @returns The exit status (0 on success).
 */
export function runSync(command: string, args: string[], cwd: string): number {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
  });

  return result.status ?? 1;
}
