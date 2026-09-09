# Contributing to eden-tanstack-query

Thanks for contributing. This project uses a strict fork-based workflow: all changes come from branches in personal forks and are merged through pull requests.

## Workflow Summary

1. Fork this repository on GitHub.
2. Clone your fork locally.
3. Add the main repository as `upstream`.
4. Create a feature/fix branch from an updated `main`.
5. Run local checks.
6. Push your branch to your fork.
7. Open a pull request to `xkelxmc/eden-tanstack-query:main`.

## Ground Rules

- Do not push directly to the upstream repository.
- Keep pull requests focused on one logical change.
- Add or update tests for behavior changes.
- Update docs/examples when API or behavior changes.

## Prerequisites

- Bun `1.4.2` (see `packageManager` in `package.json`)
- Node `24.18.0` (see `.node-version`) — used by the publish workflow
- Git
- A GitHub account with a fork of this repository

## One-Time Setup

```bash
git clone https://github.com/<your-username>/eden-tanstack-query.git
cd eden-tanstack-query
git remote add upstream https://github.com/xkelxmc/eden-tanstack-query.git
git remote -v
bun install
```

Expected remotes:

- `origin` -> your fork (`<your-username>/eden-tanstack-query`)
- `upstream` -> main repo (`xkelxmc/eden-tanstack-query`)

## Start a New Change

```bash
git fetch upstream
git switch main
git rebase upstream/main
git switch -c fix/short-description
```

Branch naming examples:

- `fix/query-key-date-collision`
- `feat/query-options-headers`
- `docs/readme-input-examples`

## Develop and Validate

Run the same checks expected by CI before opening a PR:

```bash
bun run check
bun run build:all
bun run unit-test:run
```

Optional fast pass during iteration:

```bash
bun run test
```

## Commit Style

Use clear conventional commit messages:

- `fix(query): support per-call headers in queryOptions input`
- `feat(types): improve query input inference`
- `docs(readme): clarify request shape examples`

## Push and Open a Pull Request

```bash
git push -u origin <branch-name>
```

Then open a pull request:

- **Base repository:** `xkelxmc/eden-tanstack-query`
- **Base branch:** `main`
- **Head repository:** your fork
- **Head branch:** your feature branch

## Pull Request Checklist

- [ ] Branch is up to date with `upstream/main`
- [ ] Lint, build, type checks, and tests pass locally
- [ ] New behavior is covered by tests
- [ ] Docs/examples were updated when relevant
- [ ] Commit messages are clear and scoped
- [ ] PR description includes what changed, why, and how it was validated

## Keep Your Fork in Sync

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

## Reporting Issues

When opening an issue, include:

- Reproduction steps
- Expected behavior
- Actual behavior
- Runtime/package versions
- Minimal reproduction (if possible)

## Releases

Maintainers: release steps are documented in [RELEASING.md](./RELEASING.md).
