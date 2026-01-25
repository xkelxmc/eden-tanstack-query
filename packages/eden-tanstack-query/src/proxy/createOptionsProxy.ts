/**
 * Options Proxy Creation
 *
 * Creates a recursive proxy that decorates Eden routes with TanStack Query options.
 * Transforms Eden Treaty client paths into queryOptions/mutationOptions factories.
 */
import type { Treaty } from "@elysiajs/eden"
import type { QueryClient, QueryFilters } from "@tanstack/react-query"
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
 * Navigate to the correct Eden client path with path params applied
 */
function navigateToEdenPath(
	client: unknown,
	pathSegments: string[],
	pathParams: Record<string, unknown>[],
): unknown {
	let edenPath = client
	let paramIndex = 0

	for (const segment of pathSegments) {
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

		// If there's a path param to apply at this level, call as function
		if (
			paramIndex < pathParams.length &&
			typeof edenPath === "function" &&
			!isQueryMethod(segment) &&
			!isMutationMethod(segment)
		) {
			edenPath = (edenPath as (params: unknown) => unknown)(
				pathParams[paramIndex],
			)
			paramIndex++
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
	pathParams: Record<string, unknown>[]
}

/**
 * Creates query procedure methods (queryOptions, queryKey, queryFilter, infiniteQueryOptions)
 */
function createQueryProcedure(opts: ProcedureOptions) {
	const { client, paths, pathParams } = opts

	return {
		queryOptions: (input?: unknown, queryOpts?: unknown) => {
			// Merge pathParams into input for unique cache keys
			const inputForKey =
				pathParams.length > 0
					? { ...Object.assign({}, ...pathParams), ...(input as object) }
					: input
			return edenQueryOptions({
				path: paths,
				input: inputForKey,
				fetch: async (_inputForKey, signal) => {
					// Use original input for fetch, not merged
					const actualInput = input
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

					const result = await methodFn({
						query: actualInput,
						fetch: { signal },
					})

					if (result.error) throw result.error
					return result.data
				},
				opts: queryOpts as Parameters<typeof edenQueryOptions>[0]["opts"],
			})
		},

		queryKey: (input?: unknown): EdenQueryKey => {
			// Merge pathParams into input for unique cache keys
			const mergedInput =
				pathParams.length > 0
					? { ...Object.assign({}, ...pathParams), ...(input as object) }
					: input
			return getQueryKey({ path: paths, input: mergedInput, type: "query" })
		},

		queryFilter: (
			input?: unknown,
			filters?: QueryFilters,
		): WithRequired<QueryFilters, "queryKey"> => {
			const mergedInput =
				pathParams.length > 0
					? { ...Object.assign({}, ...pathParams), ...(input as object) }
					: input
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
			// Merge pathParams into input for unique cache keys
			const inputForKey =
				pathParams.length > 0
					? { ...Object.assign({}, ...pathParams), ...(input as object) }
					: input

			return edenInfiniteQueryOptions({
				path: paths,
				input: inputForKey,
				initialPageParam: initialCursor,
				fetch: async (inputWithCursor, signal) => {
					// inputWithCursor has pathParams merged + cursor
					// Extract cursor and use original input for query
					const { cursor, direction } = (inputWithCursor ?? {}) as {
						cursor?: unknown
						direction?: unknown
					}
					const fullInput =
						cursor !== undefined || direction !== undefined
							? { ...(input as object), cursor, direction }
							: input
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

					const result = await methodFn({
						query: fullInput,
						fetch: { signal },
					})

					if (result.error) throw result.error
					return result.data
				},
				opts: restOpts as Parameters<
					typeof edenInfiniteQueryOptions
				>[0]["opts"],
			})
		},

		infiniteQueryKey: (input?: unknown): EdenQueryKey => {
			const mergedInput =
				pathParams.length > 0
					? { ...Object.assign({}, ...pathParams), ...(input as object) }
					: input
			return getQueryKey({ path: paths, input: mergedInput, type: "infinite" })
		},

		infiniteQueryFilter: (
			input?: unknown,
			filters?: QueryFilters,
		): WithRequired<QueryFilters, "queryKey"> => {
			const mergedInput =
				pathParams.length > 0
					? { ...Object.assign({}, ...pathParams), ...(input as object) }
					: input
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
	pathParams: Record<string, unknown>[] = [],
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
			const params = args[0] as Record<string, unknown>
			return createEdenOptionsProxy(opts, [...paths], [...pathParams, params])
		},
	})

	return proxy as unknown as EdenOptionsProxy<TApp>
}
