#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createProgram } from "@octalmesh/seagull-cli";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
) as { version: string; description: string };

await createProgram({ ...pkg, name: "seagull" }).parseAsync();
