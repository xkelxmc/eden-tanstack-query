# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
