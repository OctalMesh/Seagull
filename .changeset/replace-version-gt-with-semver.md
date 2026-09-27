---
"@octalmesh/seagull": patch
---

Replace the repository-local `version-gt.mjs` script with the standard `semver`
CLI (via `pnpx`) in the release-readiness check, removing duplicated
version-comparison code while preserving strict SemVer semantics.
