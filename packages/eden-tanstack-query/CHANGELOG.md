# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-05

### Breaking Changes

- `queryOptions()` now requires input when a route declares required query fields
- Infinite-query helpers are exposed only for routes with a supported top-level cursor; required cursors need an explicit non-null `initialCursor`
- `queryKey(skipToken)` and `infiniteQueryKey(skipToken)` now reject `skipToken`; use the corresponding options helper to disable a query
- Query-key identity now preserves ordered path parameters and exact infinite-query initial cursors; persisted or dehydrated caches from previous versions should be discarded
- Public route errors expose the response body at `error.value` instead of the incorrectly inferred `error.value.value`
- Minimum supported versions are now TanStack Query 5.62.0, Elysia 1.3.0, Eden 1.3.0 and TypeScript 5.5.2

### Fixed

- Keep request routing and cache identity aligned for root, nested, sequential, duplicate and numeric path parameters ([#12](https://github.com/xkelxmc/eden-tanstack-query/pull/12), [#13](https://github.com/xkelxmc/eden-tanstack-query/pull/13))
- Prevent skipped observers from replacing enabled query functions, including clients with a global default query function ([#12](https://github.com/xkelxmc/eden-tanstack-query/pull/12))
- Separate infinite queries by their initial cursor while keeping broad filters partially matchable and respecting custom query-key hash functions ([#16](https://github.com/xkelxmc/eden-tanstack-query/pull/16))
- Preserve raw fetched data, selected data, route errors, page data and page parameters across query options, infinite-query options and tagged query keys ([#16](https://github.com/xkelxmc/eden-tanstack-query/pull/16))
- Infer every successful HTTP status from 200 through 299, including Treaty's bodyless 204 and 205 responses, and preserve status-discriminated route and transport errors ([#14](https://github.com/xkelxmc/eden-tanstack-query/pull/14), [#15](https://github.com/xkelxmc/eden-tanstack-query/pull/15))
- Enforce required query input and expose infinite-query helpers only when the route cursor can be represented soundly ([#17](https://github.com/xkelxmc/eden-tanstack-query/pull/17))
- Correctly discriminate HTTP procedures, method-named child routes, reserved route-schema names, dynamic paths and supported `.all()` routes ([#18](https://github.com/xkelxmc/eden-tanstack-query/pull/18))

### Changed

- Include the Apache-2.0 license in the published package and validate the packed artifact against exact lower-bound dependencies ([#11](https://github.com/xkelxmc/eden-tanstack-query/pull/11), [#19](https://github.com/xkelxmc/eden-tanstack-query/pull/19))
- Expand strict compile-time assertions and real Eden Treaty integration coverage ([#9](https://github.com/xkelxmc/eden-tanstack-query/pull/9))
- Align the README, API reference, guides, examples, compatibility tables and package-size figures with the current API ([#10](https://github.com/xkelxmc/eden-tanstack-query/pull/10), [#19](https://github.com/xkelxmc/eden-tanstack-query/pull/19))

## [0.1.11] - 2026-08-04

### Changed
- Toolchain moved to TypeScript 7.0.2, Vite 8, Bun 1.3.14 and Node 24; the emitted bundle and declarations are byte-for-byte identical to 0.1.10
- TanStack Query 5.100.5 → 5.101.4
- Elysia 1.4.28 → 1.4.29
- React 19.2.5 → 19.2.8
- Biome 2.4.13 → 2.5.6
- vitest 4.1.5 → 4.1.10
- happy-dom 20.9.0 → 20.11.1
- `@testing-library/jest-dom` 6.9.1 → 7.0.0

No source changes: the public API, its types and the peer dependency ranges are untouched.

## [0.1.10] - 2026-04-27

### Fixed
- `skipToken` with path params now stays disabled instead of being turned into an executable query by [@RedEagle-dh](https://github.com/RedEagle-dh) ([#5](https://github.com/xkelxmc/eden-tanstack-query/pull/5))
- Query-key sanitization now preserves non-plain objects (e.g. `Date`, `Map`, `Set`) to prevent cache key collisions by [@RedEagle-dh](https://github.com/RedEagle-dh) ([#5](https://github.com/xkelxmc/eden-tanstack-query/pull/5))
- Per-request headers in `queryOptions` are now properly typed and forwarded — supports `{ ...query, headers }`, `{ query, headers }`, and direct `query` shapes by [@RedEagle-dh](https://github.com/RedEagle-dh) ([#5](https://github.com/xkelxmc/eden-tanstack-query/pull/5))
- Options proxy query-wrapper detection
- Query request input parsing edge cases

### Changed
- Updated dev dependencies to latest versions
- Biome 2.3.12 → 2.4.13
- TanStack Query 5.90.20 → 5.100.5
- Elysia 1.4.22 → 1.4.28
- Eden 1.4.6 → 1.4.9
- React 19.2.3 → 19.2.5
- happy-dom 20.3.7 → 20.9.0
- vitest 4.0.18 → 4.1.5

## [0.1.9] - 2026-02-06

### Changed
- Updated bundle size in README (10.82 KB → 11.15 KB)

## [0.1.8] - 2026-02-06

### Fixed
- Path parameters applied at wrong position in nested routes by [@imoize](https://github.com/imoize) ([#4](https://github.com/xkelxmc/eden-tanstack-query/pull/4))
  - `eden.v1.users.address({ userId }).get` now correctly produces `/v1/users/address/:userId` instead of `/v1/:userId/users/address`
  - Introduced position-based path param tracking (`PositionedPathParam`) instead of sequential application

## [0.1.7] - 2026-02-04

### Fixed
- Restore `bunfig.toml` to fix `jsx-dev-runtime` regression in 0.1.6 ([#3](https://github.com/xkelxmc/eden-tanstack-query/issues/3))

## [0.1.6] - 2026-01-25

### Fixed
- `queryKey()` now includes path parameters for proper cache differentiation
  - `eden.posts.get.queryKey()` and `eden.posts({ id }).get.queryKey()` now produce different keys
  - Fixes issue where `invalidateQueries` would invalidate wrong queries
- `queryFilter()`, `infiniteQueryKey()`, `infiniteQueryFilter()` also include path parameters

## [0.1.5] - 2026-01-25

### Changed
- Updated all dependencies to latest versions
- Biome 2.3.8 → 2.3.12
- Elysia/Eden 1.2 → 1.4
- React 19.0 → 19.2
- TanStack Query 5.90.19 → 5.90.20
- happy-dom 18 → 20

## [0.1.4] - 2025-12-17

### Fixed
- Use production `jsx-runtime` instead of `jsx-dev-runtime` in bundle ([#1](https://github.com/xkelxmc/eden-tanstack-query/issues/1))
  - Workaround for Bun v1.3 regression ([oven-sh/bun#23959](https://github.com/oven-sh/bun/issues/23959))

## [0.1.3] - 2025-12-12

### Security
- Updated minimum React 19 versions to address CVE in React Server Components
  - See: https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components
  - Safe versions: 19.0.3+, 19.1.4+, 19.2.3+
- Added strict peerDependencies to block vulnerable React 19 versions

## [0.1.2] - 2025-12-04

### Added
- CHANGELOG.md

## [0.1.1] - 2025-12-04

### Changed
- Renamed package from `@eden-tanstack-query/react` to `eden-tanstack-react-query`

## [0.1.0] - 2025-12-04

### Added
- Initial release
- `createEdenTanStackQuery()` factory for creating typed hooks
- `EdenProvider` component for React context
- `useEden()` hook for accessing typed query options
- `useEdenClient()` hook for raw Eden client access
- Query options: `queryOptions()`, `queryKey()`
- Mutation options: `mutationOptions()`, `mutationKey()`
- Infinite query options: `infiniteQueryOptions()4
- Full TypeScript inference from Elysia routes
- Path parameter support (`eden.users({ id }).get.queryOptions()`)
- Automatic query key generation from route paths
