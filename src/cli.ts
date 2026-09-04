import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { loadConfig } from "@config/loader";
import { resolveConfigPath } from "@config/resolve-config-file";
import type { ResolvedConfig } from "@config/types";

import { bundleCommand } from "@commands/bundle";
import { cleanCommand } from "@commands/clean";
import { generateDocsCommand } from "@commands/generate-docs";
import { generateSdkCommand } from "@commands/generate-sdk";
import { lintCommand } from "@commands/lint";
import { publishRegistriesCommand } from "@commands/publish-registries";
import { publishSdkCommand } from "@commands/publish-sdk";
import { serveDocsCommand } from "@commands/serve-docs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
) as { version: string; description: string };
const program = new Command();

//<editor-fold desc="Commands" defaultstate="collapsed">

program
  .name("seagull")
  .description(pkg.description)
  .version(pkg.version)
  .option(
    "-c, --config <path>",
    "path to the CLI config file (default: auto-detected in the current directory)",
  );

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
  .description("Generate the Scalar documentation site into dist/docs.")
  .action(withErrorHandling(async () => generateDocsCommand(resolveConfig())));

docs
  .command("serve")
  .description("Serve the generated documentation site locally.")
  .action(withErrorHandling(async () => serveDocsCommand(resolveConfig())));

const publish = program.command("publish").description("Publishing commands.");

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
      await publishRegistriesCommand(resolveConfig(), { dryRun: opts.dryRun });
    }),
  );

//</editor-fold>

await program.parseAsync();

interface DryRunOptions {
  dryRun?: boolean;
}

/**
 * Resolves and loads the config, using `--config` if given, else
 * auto-discovering it in the current directory.
 *
 * @returns The resolved config.
 */
function resolveConfig(): ResolvedConfig {
  const { config: configOption } = program.opts<{ config?: string }>();
  const configPath = configOption
    ? path.resolve(process.cwd(), configOption)
    : resolveConfigPath(process.cwd());

  return loadConfig(configPath);
}

/**
 * Wraps a commander action so a thrown Error prints as `seagull: <message>`
 * and exits non-zero, instead of an unhandled-rejection stack trace.
 *
 * @param fn The action function to wrap.
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
        `seagull: ${error instanceof Error ? error.message : error}`,
      );
      process.exitCode = 1;
    }
  };
}
