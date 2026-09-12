---
---

CI only: added the full release pipeline for the `dev` / `release` branch model.

- `quality.yaml` / `test.yaml` / `codeql.yaml` - typecheck+lint+format,
  the full test suite, and CodeQL, each running on push to `dev`/`release`
  and on pull requests into either branch.
- `version.yaml` - keeps a "Version Packages" PR up to date on `dev` from
  pending changesets, and once that PR merges and `dev`'s version pulls
  ahead of `release`'s, opens the `dev -> release` PR automatically.
- `release-readiness.yaml` - blocks the `dev -> release` PR until the
  version on `dev` is actually ahead of what's on `release`.
- `post-release.yaml` - once that PR merges, tags the release and opens a
  draft GitHub Release with the changelog pre-filled, and merges `release`
  straight back into `dev` so it never needs reconciling by hand.
- `publish.yaml` - publishes all four packages to npm when the draft Release is
  published, via npm Trusted Publishing (OIDC) - no `NPM_TOKEN` in CI.
- `dependabot.yaml` - weekly dependency and GitHub Actions updates against
  `dev`, grouped by ecosystem.

See `RELEASING.md` for the full walkthrough.
