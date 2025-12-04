# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Infinite query options: `infiniteQueryOptions()`
- Full TypeScript inference from Elysia routes
- Path parameter support (`eden.users({ id }).get.queryOptions()`)
- Automatic query key generation from route paths
