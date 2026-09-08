# Releasing

Publishing to npm runs through GitHub Actions with OIDC when a `v*` tag is pushed.

## Prepare the release

1. Update `packages/eden-tanstack-query/package.json` and its workspace version in `bun.lock`.
2. Finalize `packages/eden-tanstack-query/CHANGELOG.md` under `## [X.Y.Z] - YYYY-MM-DD`. Include migration instructions for incompatible changes. CI does not rename `Unreleased` or bump versions.
3. From the repository root, using the Bun version specified in `package.json`, run:

   ```bash
   bun run build
   bun run check:fix
   bun run unit-test:run
   bun run build:all
   ```

   `build` also updates the version and bundle sizes in the READMEs through `postbuild`. Review those changes along with the release notes.

4. Commit the reviewed release files on `main` with `chore: release vX.Y.Z`, then push:

   ```bash
   git push origin main
   ```

5. Wait for the main branch checks to pass, then tag that release commit:

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

## Verify publication

The [publish workflow](.github/workflows/publish.yml) checks and builds the package, runs tests, publishes to npm with provenance, and creates a GitHub Release from the matching changelog section.

Confirm the workflow succeeds and the version appears in both places:

- [GitHub Releases](https://github.com/xkelxmc/eden-tanstack-query/releases)
- [npm](https://www.npmjs.com/package/eden-tanstack-react-query)

The tag and package version must match. Do not move a published release tag or reuse a published npm version. If publication fails, inspect the failed step and check whether npm publication already completed before retrying.

## Versioning

Before 1.0, use patch releases for compatible fixes and minor releases for new features or incompatible changes, including changes that require consumer TypeScript edits. Document each incompatibility and its migration in the changelog.

From 1.0 onward, follow [SemVer](https://semver.org/): patch for compatible fixes, minor for compatible additions, major for incompatible changes.
