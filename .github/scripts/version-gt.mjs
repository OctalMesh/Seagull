#!/usr/bin/env node

// Exits 0 if version A is strictly greater than version B, 1 otherwise.
// Plain X.Y.Z numeric compare - this repo's fixed-group versions never carry
// prerelease/build metadata, so full semver parsing is unnecessary.
//
// Usage: node version-gt.mjs <a> <b>
// Used by release-readiness.yaml (PR version vs release) and version.yaml
// (dev version vs release, to decide whether to open a dev -> release PR).

const [a, b] = process.argv.slice(2);

if (!a || !b) {
  console.error("Usage: version-gt.mjs <a> <b>");
  process.exit(2);
}

const parts = (v) => v.split(".").map(Number);
const [pa, pb] = [parts(a), parts(b)];

for (let i = 0; i < 3; i++) {
  const x = pa[i] ?? 0;
  const y = pb[i] ?? 0;

  if (x !== y) {
    process.exit(x > y ? 0 : 1);
  }
}

process.exit(1);
