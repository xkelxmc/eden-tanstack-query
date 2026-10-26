# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-10-26

### Maintenance

- Refresh development, documentation, example, and transitive dependencies, including fixes for known vulnerabilities in the workspace lockfile ([#68](https://github.com/xkelxmc/eden-tanstack-query/pull/68)).
- Build and test with Bun 1.4.4, React 19.3.1, TanStack Query 5.104.5, and Elysia 1.4.30.
- Require newly resolved packages to be at least 24 hours old and scan installations with Socket. Add `bun run deps:audit` for npm advisory checks.

The public API, query-key format, and peer dependency requirements are unchanged. Consumers do not need to reset persisted caches or change their code.

## [0.5.0] - 2026-09-14

### Breaking Changes

- Raise the minimum supported TanStack React Query version from 5.62.0 to 5.102.8. Upgrade `@tanstack/react-query` to 5.102.8 or a later v5 release before upgrading this package, and use a compatible Query devtools version ([#53](https://github.com/xkelxmc/eden-tanstack-query/pull/53)).
- Infer explicit infinite-query cursors from the full non-nullable route cursor type. For a `string | number` cursor, `initialCursor: 0` no longer narrows callback page parameters to `number`. Handle the union or supply an explicit page-parameter generic when intentionally narrowing it ([#48](https://github.com/xkelxmc/eden-tanstack-query/pull/48)).
- Tighten query input typing around fields named `query` and `headers`. Use an outer `{ query: input, headers }` wrapper to add HTTP headers when the schema has a `query` field. Schemas combining `query` with an optional `headers` field require a wrapper even when that field is omitted. For unions with a colliding member, use wrappers for HTTP headers on every member ([#47](https://github.com/xkelxmc/eden-tanstack-query/pull/47)).

### Added

- Add opt-in `mutationOptions({ request: true })` for per-invocation `{ body, query, headers }` variables. Required route fields and lifecycle callback variables/context remain typed. Existing body-only mutation calls and mutation keys are unchanged ([#49](https://github.com/xkelxmc/eden-tanstack-query/pull/49)).

### Fixed

- Preserve a signal configured on the Treaty client when query cancellation forwarding is disabled, for both regular and infinite queries ([#45](https://github.com/xkelxmc/eden-tanstack-query/pull/45)).
- Keep scalar `headers` fields in direct query input instead of treating them as HTTP headers when paired with a `query` field ([#47](https://github.com/xkelxmc/eden-tanstack-query/pull/47)).
- Preserve the exact data-tagged keys returned by `queryFilter` and `infiniteQueryFilter` with React Query 5.102.8, retaining inferred cache reads and rejecting invalid cache writes ([#53](https://github.com/xkelxmc/eden-tanstack-query/pull/53)).

### Documentation and Examples

- Add runnable authenticated TanStack Start, Astro, and Next.js App Router examples covering SSR, hydration, and client interactions ([#50](https://github.com/xkelxmc/eden-tanstack-query/pull/50), [#51](https://github.com/xkelxmc/eden-tanstack-query/pull/51), [#59](https://github.com/xkelxmc/eden-tanstack-query/pull/59)).
- Clarify Treaty response decoding limits, correct query-key metadata and setup commands, and document Pages Router serialization for dates and other non-JSON values ([#46](https://github.com/xkelxmc/eden-tanstack-query/pull/46), [#52](https://github.com/xkelxmc/eden-tanstack-query/pull/52)).

### Maintenance

- Update test and documentation tooling, pin development/example versions, and move repository tooling to Bun 1.4.2. Add a read-only dependency checker with semver-aware reporting and explicit incomplete-check errors ([#54](https://github.com/xkelxmc/eden-tanstack-query/pull/54), [#55](https://github.com/xkelxmc/eden-tanstack-query/pull/55), [#56](https://github.com/xkelxmc/eden-tanstack-query/pull/56), [#57](https://github.com/xkelxmc/eden-tanstack-query/pull/57), [#58](https://github.com/xkelxmc/eden-tanstack-query/pull/58)).

Query-key structure is unchanged. Inputs previously misclassified as wrappers, such as `{ query: 'hello', headers: 'query-value' }`, now produce keys for their complete direct query input. Discard affected persisted entries or regenerate manually stored keys with the helpers. Unaffected inputs do not require a cache reset. Elysia, Eden, and React peer ranges are unchanged.

## [0.4.0] - 2026-09-09

### Breaking Changes

- Wrapped query inputs with `headers: undefined` now use the same cache key as wrappers with `headers: {}`, separating them from direct query parameters named `query`. Discard old persisted entries for affected route/input combinations, including direct-looking entries that shared the old keys, or reset the persisted cache. Regenerate manually stored keys with the helpers. Other direct-input keys and wrappers with header values are unchanged ([#37](https://github.com/xkelxmc/eden-tanstack-query/pull/37)).
- Required mutation object bodies remain required when all their fields are optional. Replace `mutate()` or `mutateAsync()` with `mutate({})` or `mutateAsync({})` for these schemas. No-body and optional-object routes still allow omission; their lifecycle callbacks must handle missing variables ([#38](https://github.com/xkelxmc/eden-tanstack-query/pull/38)).
- Query schemas with an object-valued field named `headers` require explicit wrapped input, such as `{ query: input, headers: undefined }`. For unions containing such a member, use wrappers for HTTP headers on all members. The restriction also covers arrays and other object types; scalar-only fields and noncolliding schemas retain direct input ([#43](https://github.com/xkelxmc/eden-tanstack-query/pull/43)).
- Required query unions without shared keys now reject missing or invalid input instead of accepting it as an empty schema. Supply a valid union member ([#36](https://github.com/xkelxmc/eden-tanstack-query/pull/36)).
- Response types now describe decoded form payloads, async generators for readable streams, and early generator return values. Read form fields directly and narrow generator responses before iteration. A streamed generator completes with `void`; an early void return decodes to `""`. Declared error values use the same conversions ([#39](https://github.com/xkelxmc/eden-tanstack-query/pull/39)).
- Optional path parameter names no longer include `?`. Use `{ id: value }` for `/:id?`, or omit the call to omit the segment. `PathParamsToObject` now marks optional parameters as optional properties ([#44](https://github.com/xkelxmc/eden-tanstack-query/pull/44)).

### Fixed

- Forward OPTIONS query parameters, request headers, and cancellation signals through the correct Treaty argument for regular and infinite queries ([#34](https://github.com/xkelxmc/eden-tanstack-query/pull/34)).
- Match regular cached queries with `queryFilter(input, { exact: true })`. Broad filters still include regular and infinite queries; use `infiniteQueryFilter` for exact infinite-query matching ([#35](https://github.com/xkelxmc/eden-tanstack-query/pull/35)).
- Expose omitted optional path branches while preserving explicit route precedence, shared child paths, and matching supplied parameter branches ([#44](https://github.com/xkelxmc/eden-tanstack-query/pull/44)).

### Documentation

- Show separate QueryClients for multiple backends with overlapping route keys ([#40](https://github.com/xkelxmc/eden-tanstack-query/pull/40)).
- Separate server and client Eden modules in the App Router guide and clarify authentication and cross-site cookie requirements ([#41](https://github.com/xkelxmc/eden-tanstack-query/pull/41)).
- Add CORS setup to the package README's browser quick start ([#42](https://github.com/xkelxmc/eden-tanstack-query/pull/42)).

Peer dependency requirements are unchanged from 0.3.0.

## [0.3.0] - 2026-09-08

### Breaking Changes

- Wrapped inputs to `queryOptions()` and `infiniteQueryOptions()` now require an explicit `headers` property. Pass query parameters directly, or use `{ query, headers: undefined }` when no headers are needed. Variables typed with optional `headers?` must also supply the property explicitly, for example `{ ...input, headers: input.headers }`. This aligns the types with existing request parsing; a query parameter named `query` remains supported ([#20](https://github.com/xkelxmc/eden-tanstack-query/pull/20)).
- Mutation options no longer accept the unused `eden` settings: `eden.abortOnUnmount` on proxy mutations and `eden.context` on `edenMutationOptions()`. Remove these settings and any empty `eden` object. Neither setting affected mutation behavior; TanStack Query `onMutate` context and `meta` remain supported ([#25](https://github.com/xkelxmc/eden-tanstack-query/pull/25)).

### Fixed

- `GetRoute` resolves root and nested schema paths, including dynamic segments such as `/users/:id`, with or without a leading slash ([#21](https://github.com/xkelxmc/eden-tanstack-query/pull/21)).

### Deprecated

- `queryClient` on `EdenProvider` and `createEdenOptionsProxy()` is unused and remains accepted for compatibility. It is now optional on `EdenProvider`. Continue supplying the client to TanStack Query's `QueryClientProvider` ([#24](https://github.com/xkelxmc/eden-tanstack-query/pull/24)).

### Documentation and Examples

- Correct provider setup in the API reference, SSR guide, and testing guide.
- Keep documentation copy actions from copying HTTP error responses as Markdown.
- Fix example row actions, preserve form drafts after failed requests, distinguish query errors from missing records, and refresh both comment views after creation.

Request parsing, query-key format, and peer dependency requirements are unchanged from 0.2.0. Existing persisted query caches do not need to be discarded for this update.

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
