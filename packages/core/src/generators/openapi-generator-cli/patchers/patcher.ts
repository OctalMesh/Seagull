import type { GenerateContext } from "../../../generator/types";

/**
 * A strategy that post-processes an `openapi-generator-cli` output directory
 * after generation - patching in the version, repository metadata, and
 * publishing config that the generator itself doesn't know about. One
 * implementation per language (`npm`, `go-module`, `maven`), selected by
 * openapi-generator-cli based on `artifact.lang`, so the base generator class
 * stays language-agnostic.
 */
export interface Patcher {
  /**
   * @param ctx - The generate context (contract, artifact, version, ...) for
   *              the artifact that was just generated.
   */
  patch(ctx: GenerateContext): Promise<void>;
}
