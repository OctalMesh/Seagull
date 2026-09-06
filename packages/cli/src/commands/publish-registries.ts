import {
  type ResolvedConfig,
  run as runProcess,
} from "@octalmesh/seagull-core";

export interface PublishRegistriesOptions {
  dryRun?: boolean;
}

/**
 * Publishes registry-backed packages:
 *   - TypeScript (client and server-types) -> npm (needs a configured registry
 *     or auth token on the machine running this).
 *   - Java (client and server) -> Maven (needs `~/.m2/settings.xml` credentials
 *     for whichever repository `mvn deploy` resolves to).
 *
 * Go packages are intentionally skipped - they're consumed straight from
 * their git branch/tag (see `publish-sdk.ts`), Go has no registry step.
 *
 * @param config  - The resolved CLI config.
 * @param options - `{ dryRun }` - print what would run without running it.
 */
export async function publishRegistriesCommand(
  config: ResolvedConfig,
  options: PublishRegistriesOptions = {},
): Promise<void> {
  const dryRun = options.dryRun ?? false;

  async function runCommand(
    cmd: string,
    args: string[],
    cwd: string,
  ): Promise<void> {
    console.log(`$ ${cmd} ${args.join(" ")}  (in ${cwd})`);

    if (dryRun) {
      return;
    }

    await runProcess(cmd, args, cwd);
  }

  let publishedCount = 0;

  for (const { contract, artifact } of config.allArtifacts) {
    if (artifact.lang === "typescript") {
      console.log(
        `\n=== npm publish: ${artifact.package} (contract: ${contract.name}, ${artifact.kind}) ===`,
      );
      await runCommand("npm", ["publish"], artifact.outputDir);

      publishedCount += 1;
    }

    if (artifact.lang === "java") {
      console.log(
        `\n=== maven deploy: ${artifact.maven?.groupId}:${artifact.maven?.artifactId} (contract: ${contract.name}, ${artifact.kind}) ===`,
      );
      await runCommand(
        "mvn",
        ["-B", "deploy", "-DskipTests"],
        artifact.outputDir,
      );

      publishedCount += 1;
    }
  }

  console.log(`\nDone - published ${publishedCount} registry package(s).`);
}
