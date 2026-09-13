<!--suppress HtmlDeprecatedAttribute, HtmlUnknownTarget -->
<h1 id="title" align="center">Changesets</h1>

<div align="center">
  <h6>
    <a rel="noopener noreferrer" href="../README.md">Readme</a>
    ·
    <a rel="noopener noreferrer" href="../RELEASING.md">Releasing</a>
    ·
    <a rel="noopener noreferrer" href="../CONTRIBUTING.md">Contributing</a>
    ·
    <a rel="noopener noreferrer" href="https://changesets.dev">Changesets Docs</a>
  </h6>
</div>

This directory contains pending changeset files managed by
[@changesets/cli](https://github.com/changesets/changesets). Changesets are
small Markdown files that record what changed in a PR and what semver level
(patch, minor, or major) should be bumped upon release.

<div align="center">
  <h2 id="overview">Overview</h2>
</div>

| Concept               | Description                                                                                                                                                          |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Locked Versioning** | All four packages (`@octalmesh/seagull`, `-core`, `-cli`, `-docs`) are in a fixed version group (see `config.json`). Bumping one package bumps all four in lockstep. |
| **Changeset File**    | A Markdown file added to `.changeset/` describing a specific change and its target bump type.                                                                        |
| **Consumption**       | During a release, `pnpm run version` reads all `.changeset/*.md` files, updates `package.json`s and `CHANGELOG.md` files, and deletes the applied changesets.        |

> [!NOTE]
> Detailed instructions on how changesets integrate into our release automation
> and CI workflows can be found in [Releasing](../RELEASING.md).

<div align="center">
  <h2 id="adding-a-changeset">Adding a Changeset</h2>
</div>

When contributing code that affects package functionality, generate a changeset
file from the root directory:

```bash
pnpm run changeset
```

1. **Select package(s)**: Choose any changed package. Because of the `fixed`
   version group, selecting one bumps all packages together.
2. **Select bump type**: Choose `patch` (bug fixes), `minor` (new features), or
   `major` (breaking changes).
3. **Summary**: Provide a concise description of your changes.
4. **Commit**: Commit the newly generated `.changeset/<name>.md` file alongside
   your PR.

> [!TIP]
> For CI-only, documentation-only, or non-user-facing PRs that require a
> changeset check to pass, generate an empty changeset without triggering a
> version bump:
> ```bash
> pnpm run changeset:empty
> ```

| Command                     | Description                                                                              |
|-----------------------------|------------------------------------------------------------------------------------------|
| `pnpm run changeset`        | Interactively create a new changeset file.                                               |
| `pnpm run changeset:empty`  | Create an empty changeset (no version bump or changelog entry).                          |
| `pnpm run changeset:status` | Preview pending changesets and calculated version bumps without modifying files.         |
| `pnpm run version`          | Consume changesets, bump package versions, and update changelogs (used primarily by CI). |
