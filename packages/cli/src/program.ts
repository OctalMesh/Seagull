import path from "node:path";

import {
  type ResolvedConfig,
  loadConfig,
  resolveConfigPath,
} from "@octalmesh/seagull-core";
import { Command } from "commander";

import { bundleCommand } from "./commands/bundle";
import { cleanCommand } from "./commands/clean";
import { generateDocsCommand } from "./commands/generate-docs";
import { generateSdkCommand } from "./commands/generate-sdk";
import { lintCommand } from "./commands/lint";
import { publishRegistriesCommand } from "./commands/publish-registries";
import { publishSdkCommand } from "./commands/publish-sdk";
import { serveDocsCommand } from "./commands/serve-docs";

export interface ProgramMetadata {
  name: string;
  version: string;
  description: string;
}

interface DryRunOptions {
  dryRun?: boolean;
}

/**
 * Builds the seagull commander program - every subcommand, wired up to the
 * pipeline command functions. Pure and side-effect-free (doesn't parse
 * `process.argv` or read any file itself) so it's usable both by the real
 * CLI entrypoint and by anything that wants to drive it programmatically or
 * test it.
 *
 * @param metadata - `{ name, version, description }` shown in `--help`/`--version`
 *                   - the caller's own `package.json` fields, since this
 *                   package doesn't read its own (it's bundled into
 *                   `@octalmesh/seagull`, whose metadata is what should show).
 * @returns The configured commander `Command`, ready for `.parseAsync()`.
 */
export function createProgram(metadata: ProgramMetadata): Command {
  const program = new Command();

  program
    .name(metadata.name)
    .description(metadata.description)
    .version(metadata.version)
    .option(
      "-c, --config <path>",
      "path to the seagull config file (default: auto-detected in the current directory)",
    );

  /**
   * Resolves and loads the config, using `--config` if given, else
   * auto-discovering it in the current directory.
   */
  function resolveConfig(): ResolvedConfig {
    const { config: configOption } = program.opts<{ config?: string }>();
    const configPath = configOption
      ? path.resolve(process.cwd(), configOption)
      : resolveConfigPath(process.cwd());

    return loadConfig(configPath);
  }

  program
    .command("lint")
    .description("Lint every contract's OpenAPI spec with Redocly.")
    .action(withErrorHandling(async () => lintCommand(resolveConfig())));

  program
    .command("bundle")
    .description("Bundle every contract's OpenAPI spec into dist/specs.")
    .action(withErrorHandling(async () => bundleCommand(resolveConfig())));

  program
    .command("generate")
    .description("Generate every configured SDK artifact into dist/sdk.")
    .action(withErrorHandling(async () => generateSdkCommand(resolveConfig())));

  program
    .command("clean")
    .description("Remove the dist output directory.")
    .action(withErrorHandling(async () => cleanCommand(resolveConfig())));

  const docs = program
    .command("docs")
    .description("Documentation site commands.");

  docs
    .command("generate")
    .description("Generate the documentation site into dist/docs.")
    .action(
      withErrorHandling(async () => generateDocsCommand(resolveConfig())),
    );

  docs
    .command("serve")
    .description("Serve the generated documentation site locally.")
    .action(withErrorHandling(async () => serveDocsCommand(resolveConfig())));

  const publish = program
    .command("publish")
    .description("Publishing commands.");

  publish
    .command("sdk")
    .description(
      "Publish generated SDKs to their per-artifact git branches/tags.",
    )
    .option("--dry-run", "print what would be pushed without pushing")
    .action(
      withErrorHandling(async (opts: DryRunOptions) => {
        await publishSdkCommand(resolveConfig(), { dryRun: opts.dryRun });
      }),
    );

  publish
    .command("registries")
    .description("Publish registry-backed packages (npm publish / mvn deploy).")
    .option("--dry-run", "print what would be published without publishing")
    .action(
      withErrorHandling(async (opts: DryRunOptions) => {
        await publishRegistriesCommand(resolveConfig(), {
          dryRun: opts.dryRun,
        });
      }),
    );

  return program;
}

/**
 * Wraps a commander action so a thrown Error prints as `seagull: <message>`
 * and exits non-zero, instead of an unhandled-rejection stack trace.
 *
 * @param fn - The action function to wrap.
 * @returns A wrapped action function that handles errors.
 */
function withErrorHandling<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error(
        `seagull: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
  };
}
