import type {
  ResolvedArtifact,
  ResolvedArtifactEntry,
  ResolvedContract,
} from "../config/types";

/**
 * Passed once per tool to {@link Generator.prepare}, before any of that
 * tool's {@link Generator.generate} calls run.
 */
export interface PrepareContext {
  rootDir: string;
  /**
   * Every (contract, artifact) pair that uses this generator's `tool`, across
   * all contracts.
   */
  entries: ResolvedArtifactEntry[];
}

/**
 * Passed once per artifact to {@link Generator.generate}.
 */
export interface GenerateContext {
  rootDir: string;
  contract: ResolvedContract;
  artifact: ResolvedArtifact;
  version: string;
  github: { owner: string; repo: string };
  /**
   * Absolute path to the contract's bundled JSON spec
   * (`<specsDir>/<contract>.json`).
   */
  specInputPath: string;
}
