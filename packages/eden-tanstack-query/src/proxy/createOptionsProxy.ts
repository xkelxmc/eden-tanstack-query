/**
 * Options Proxy Creation
 *
 * Creates a recursive proxy that decorates Eden routes with TanStack Query options.
 * Transforms Eden Treaty client paths into queryOptions/mutationOptions factories.
 */
import type { Treaty } from "@elysiajs/eden"
import type { QueryClient, QueryFilters } from "@tanstack/react-query"
import { skipToken } from "@tanstack/react-query"
import type { AnyElysia } from "elysia"

import { getMutationKey, getQueryKey } from "../keys/queryKey"
import type { EdenMutationKey, EdenQueryKey } from "../keys/types"
import { edenInfiniteQueryOptions } from "../options/infiniteQueryOptions"
import { edenMutationOptions } from "../options/mutationOptions"
import { edenQueryOptions } from "../options/queryOptions"
import type { EdenOptionsProxy } from "../types/decorators"

// ============================================================================
// Types
// ============================================================================

/** HTTP methods that map to queries */
const QUERY_METHODS = ["get", "options", "head"] as const

/** HTTP methods that map to mutations */
const MUTATION_METHODS = ["post", "put", "patch", "delete"] as const

type QueryMethod = (typeof QUERY_METHODS)[number]
type MutationMethod = (typeof MUTATION_METHODS)[number]

/** Options for creating the proxy */
export interface CreateEdenOptionsProxyOptions<TApp extends AnyElysia> {
	/** Eden Treaty client instance */
	client: Treaty.Create<TApp>
	/**
	 * QueryClient instance or getter function.
	 * Reserved for future use (SSR prefetching, React context integration).
	 * Use a getter when the client may not be available at proxy creation time.
	 */
	queryClient?: QueryClient | (() => QueryClient)
}

/** Helper to make some properties required */
type WithRequired<TObj, TKey extends keyof TObj> = TObj & {
	[P in TKey]-?: TObj[P]
}

/**
 * Path parameter with its associated path index.
 * Records which path segment the param was applied to.
 */
export interface PositionedPathParam {
	/** The index in the path array where this param should be applied */
	pathIndex: number
	/** The actual parameter values */
	params: Record<string, unknown>
}

interface ParsedQueryRequestInput {
	query: unknown
	headers?: Record<string, unknown>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a property name is a query method
 */
function isQueryMethod(prop: string): prop is QueryMethod {
	return (QUERY_METHODS as readonly string[]).includes(prop)
}

/**
 * Check if a property name is a mutation method
 */
function isMutationMethod(prop: string): prop is MutationMethod {
	return (MUTATION_METHODS as readonly string[]).includes(prop)
}

/**
 * Get the last element of paths array (the HTTP method)
 */
function getMethod(paths: string[]): string {
	const method = paths.at(-1)
	if (!method) {
		throw new Error("Path must contain at least one segment")
	}
	return method
}

/**
 * Extract and merge all params from PositionedPathParam array for cache keys.
 */
function mergePathParams(
	pathParams: PositionedPathParam[],
): Record<string, unknown> {
	return Object.assign({}, ...pathParams.map((path) => path.params))
}

/**
 * Merge path params into input for cache-key generation while preserving skipToken.
 */
function mergePathParamsIntoInputForKey(
	input: unknown,
	pathParams: PositionedPathParam[],
): unknown {
	if (pathParams.length === 0) return input
	if (input === skipToken) return skipToken

	const mergedPathParams = mergePathParams(pathParams)

	if (input === undefined) return mergedPathParams
	if (input === null) return mergedPathParams

	return typeof input === "object"
		? { ...mergedPathParams, ...(input as object) }
		: { ...mergedPathParams, input }
}

/**
 * Check if a value is a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Parse query input into Eden's request shape.
 * Supports:
 * - direct query input: { role: "admin" }
 * - direct query + headers: { role: "admin", headers: {...} }
 * - request shape: { query: { role: "admin" }, headers: {...} }
 */
function parseQueryRequestInput(input: unknown): ParsedQueryRequestInput {
	if (!isRecord(input)) return { query: input }

	const hasQuery = Object.hasOwn(input, "query")
	const hasHeaders = Object.hasOwn(input, "headers")
	const headersValue = hasHeaders ? input.headers : undefined
	const hasRecordHeaders = isRecord(headersValue)
	const hasOnlyWrappedKeys = Object.keys(input).every(
		(key) => key === "query" || key === "headers",
	)

	// A lone { query: value } is a valid query object for routes with a
	// query parameter named "query"; require the headers key to opt in.
	if (hasQuery && hasHeaders && hasOnlyWrappedKeys) {
		return {
			query: input.query,
			headers: hasRecordHeaders ? headersValue : undefined,
		}
	}

	if (hasHeaders && hasRecordHeaders) {
		const { headers, ...query } = input
		return {
			query: Object.keys(query).length > 0 ? query : undefined,
			headers: headers as Record<string, unknown>,
		}
	}

	return { query: input }
}

/**
 * Add cursor/direction to an existing query input for infinite requests.
 */
function addCursorToQueryInput(
	query: unknown,
	cursor?: unknown,
	direction?: unknown,
): unknown {
	const hasCursor = cursor !== undefined
	const hasDirection = direction !== undefined

	if (!hasCursor && !hasDirection) return query

	const cursorInput: Record<string, unknown> = {}
	if (hasCursor) cursorInput.cursor = cursor
	if (hasDirection) cursorInput.direction = direction

	if (isRecord(query)) return { ...query, ...cursorInput }
	if (query === undefined || query === null) return cursorInput

	return { ...cursorInput, query }
}

/**
 * Navigate to the correct Eden client path with path params applied.
 * Applies params at their recorded path indices to ensure correct URL structure.
 */
function navigateToEdenPath(
	client: unknown,
	pathSegments: string[],
	pathParams: PositionedPathParam[],
): unknown {
	let edenPath = client

	// Build a Map for O(1) param lookup by index
	const positionedParamsIndex = new Map(
		pathParams.map((p) => [p.pathIndex, p.params]),
	)

	for (let i = 0; i < pathSegments.length; i++) {
		const segment = pathSegments[i]

		// TypeScript guard: segment is always defined within valid loop bounds
		if (segment === undefined) {
			continue
		}

		if (edenPath == null) {
			throw new Error(
				`Invalid path: cannot access '${segment}' on null/undefined`,
			)
		}

		// Navigate to next segment
		const nextPath = (edenPath as Record<string, unknown>)[segment]

		if (nextPath === undefined) {
			throw new Error(
				`Invalid path: segment '${segment}' does not exist on client`,
			)
		}

		edenPath = nextPath

		// Apply path param if one was recorded at this index
		// Skip if current segment is a query/mutation method
		if (!isQueryMethod(segment) && !isMutationMethod(segment)) {
			const params = positionedParamsIndex.get(i)
			if (params && typeof edenPath === "function") {
				edenPath = (edenPath as (params: unknown) => unknown)(params)
			}
		}
	}

	return edenPath
}

// ============================================================================
// Query Procedure
// ============================================================================

interface ProcedureOptions {
	client: unknown
	paths: string[]
	pathParams: PositionedPathParam[]
}

/**
 * Creates query procedure methods (queryOptions, queryKey, queryFilter, infiniteQueryOptions)
 */
function createQueryProcedure(opts: ProcedureOptions) {
	const { client, paths, pathParams } = opts

	return {
		queryOptions: (input?: unknown, queryOpts?: unknown) => {
			const inputForKey = mergePathParamsIntoInputForKey(input, pathParams)
			return edenQueryOptions({
				path: paths,
				input: inputForKey,
				fetch: async (_inputForKey, signal) => {
					// Use original input for fetch, not merged
					const actualInput = input
					const { query, headers } = parseQueryRequestInput(actualInput)
					// Build path without the method
					const pathWithoutMethod = paths.slice(0, -1)
					const method = getMethod(paths)

					// Navigate to the endpoint
					const edenEndpoint = navigateToEdenPath(
						client,
						pathWithoutMethod,
						pathParams,
					)

					// Call the method
					const methodFn = (edenEndpoint as Record<string, unknown>)[
						method
					] as (opts: unknown) => Promise<{ data: unknown; error: unknown }>

					const requestInput: Record<string, unknown> = {
						fetch: { signal },
					}

					if (query !== undefined) requestInput.query = query
					if (headers !== undefined) requestInput.headers = headers

					const result = await methodFn(requestInput)

					if (result.error) throw result.error
					return result.data
				},
				opts: queryOpts as Parameters<typeof edenQueryOptions>[0]["opts"],
			})
		},

		queryKey: (input?: unknown): EdenQueryKey => {
			const mergedInput = mergePathParamsIntoInputForKey(input, pathParams)
			return getQueryKey({ path: paths, input: mergedInput, type: "query" })
		},

		queryFilter: (
			input?: unknown,
			filters?: QueryFilters,
		): WithRequired<QueryFilters, "queryKey"> => {
			const mergedInput = mergePathParamsIntoInputForKey(input, pathParams)
			return {
				...filters,
				queryKey: getQueryKey({ path: paths, input: mergedInput, type: "any" }),
			}
		},

		infiniteQueryOptions: (
			input: unknown,
			infiniteOpts: {
				getNextPageParam: (lastPage: unknown) => unknown
				getPreviousPageParam?: (firstPage: unknown) => unknown
				initialCursor?: unknown
			},
		) => {
			const { initialCursor = null, ...restOpts } = infiniteOpts
			const inputForKey = mergePathParamsIntoInputForKey(input, pathParams)

			return edenInfiniteQueryOptions({
				path: paths,
				input: inputForKey,
				initialPageParam: initialCursor,
				fetch: async (inputWithCursor, signal) => {
					// inputWithCursor has pathParams merged + cursor
					// Extract cursor and merge into parsed query input
					const { cursor, direction } = (inputWithCursor ?? {}) as {
						cursor?: unknown
						direction?: unknown
					}
					const { query: parsedQuery, headers } = parseQueryRequestInput(input)
					const fullInput = addCursorToQueryInput(
						parsedQuery,
						cursor,
						direction,
					)
					// Build path without the method
					const pathWithoutMethod = paths.slice(0, -1)
					const method = getMethod(paths)

					// Navigate to the endpoint
					const edenEndpoint = navigateToEdenPath(
						client,
						pathWithoutMethod,
						pathParams,
					)

					// Call the method with cursor included in query
					const methodFn = (edenEndpoint as Record<string, unknown>)[
						method
					] as (opts: unknown) => Promise<{ data: unknown; error: unknown }>

					const requestInput: Record<string, unknown> = {
						fetch: { signal },
					}

					if (fullInput !== undefined) requestInput.query = fullInput
					if (headers !== undefined) requestInput.headers = headers

					const result = await methodFn(requestInput)

					if (result.error) throw result.error
					return result.data
				},
				opts: restOpts as Parameters<
					typeof edenInfiniteQueryOptions
				>[0]["opts"],
			})
		},

		infiniteQueryKey: (input?: unknown): EdenQueryKey => {
			const mergedInput = mergePathParamsIntoInputForKey(input, pathParams)
			return getQueryKey({ path: paths, input: mergedInput, type: "infinite" })
		},

		infiniteQueryFilter: (
			input?: unknown,
			filters?: QueryFilters,
		): WithRequired<QueryFilters, "queryKey"> => {
			const mergedInput = mergePathParamsIntoInputForKey(input, pathParams)
			return {
				...filters,
				queryKey: getQueryKey({
					path: paths,
					input: mergedInput,
					type: "infinite",
				}),
			}
		},
	}
}

// ============================================================================
// Mutation Procedure
// ============================================================================

/**
 * Creates mutation procedure methods (mutationOptions, mutationKey)
 */
function createMutationProcedure(opts: ProcedureOptions) {
	const { client, paths, pathParams } = opts

	return {
		mutationOptions: (mutationOpts?: unknown) => {
			return edenMutationOptions({
				path: paths,
				mutate: async (input) => {
					// Build path without the method
					const pathWithoutMethod = paths.slice(0, -1)
					const method = getMethod(paths)

					// Navigate to the endpoint
					const edenEndpoint = navigateToEdenPath(
						client,
						pathWithoutMethod,
						pathParams,
					)

					// Call the method with body
					const methodFn = (edenEndpoint as Record<string, unknown>)[
						method
					] as (body: unknown) => Promise<{ data: unknown; error: unknown }>

					const result = await methodFn(input)

					if (result.error) throw result.error
					return result.data
				},
				opts: mutationOpts as Parameters<typeof edenMutationOptions>[0]["opts"],
			})
		},

		mutationKey: (): EdenMutationKey => {
			return getMutationKey({ path: paths })
		},
	}
}

// ============================================================================
// Main Proxy Creation
// ============================================================================

/**
 * Creates a recursive proxy that decorates Eden routes with TanStack Query options.
 *
 * @example
 * ```typescript
 * const client = treaty<App>('http://localhost:3000')
 * const queryClient = new QueryClient()
 *
 * const eden = createEdenOptionsProxy<App>({ client, queryClient })
 *
 * // Query options
 * const options = eden.api.users.get.queryOptions({ search: 'test' })
 * const { data } = useQuery(options)
 *
 * // With path params
 * const userOptions = eden.api.users({ id: '1' }).get.queryOptions()
 *
 * // Mutation options
 * const createOptions = eden.api.users.post.mutationOptions({
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: eden.api.users.get.queryKey() })
 * })
 * ```
 */
export function createEdenOptionsProxy<TApp extends AnyElysia>(
	opts: CreateEdenOptionsProxyOptions<TApp>,
	paths: string[] = [],
	pathParams: PositionedPathParam[] = [],
): EdenOptionsProxy<TApp> {
	const { client } = opts

	// Using function as proxy target to support both property access and function calls.
	// This enables: eden.api.users({ id }).get.queryOptions()
	const proxy = new Proxy(function edenProxy() {}, {
		get: (_target, prop: string) => {
			// Prevent promise auto-unwrapping when proxy is used in async context.
			// e.g., `await eden` would try to access `.then` which we don't support.
			if (typeof prop === "symbol" || prop === "then") {
				return undefined
			}

			// Check if it's a query method (GET, OPTIONS, HEAD)
			if (isQueryMethod(prop)) {
				return createQueryProcedure({
					client,
					paths: [...paths, prop],
					pathParams: [...pathParams],
				})
			}

			// Check if it's a mutation method (POST, PUT, PATCH, DELETE)
			if (isMutationMethod(prop)) {
				return createMutationProcedure({
					client,
					paths: [...paths, prop],
					pathParams: [...pathParams],
				})
			}

			// Otherwise, continue building path (immutable spread to prevent race conditions)
			return createEdenOptionsProxy(opts, [...paths, prop], [...pathParams])
		},

		apply: (_target, _thisArg, args) => {
			// Function call = path params
			// e.g., eden.api.users({ id: '1' }) → adds path param
			// Record the current path index so params are applied at the correct position
			const params =
				args && args.length > 0 && args[0] !== undefined
					? (args[0] as Record<string, unknown>)
					: {}
			const positionedPathParam: PositionedPathParam = {
				pathIndex: paths.length - 1,
				params,
			}
			return createEdenOptionsProxy(
				opts,
				[...paths],
				[...pathParams, positionedPathParam],
			)
		},
	})

	return proxy as unknown as EdenOptionsProxy<TApp>
}
