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
import type {
	EdenMutationKey,
	EdenQueryKey,
	EdenQueryKeyPathParam,
} from "../keys/types"
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

/** Captured path parameter shared by request routing and query keys. */
export type PositionedPathParam = EdenQueryKeyPathParam

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

function capturePathParam(
	pathIndex: number,
	params: Record<string, unknown>,
): PositionedPathParam {
	return {
		pathIndex,
		entries: Object.entries(params)
			.map(([name, value]): [string, unknown] => [
				name,
				typeof value === "number" ? String(value) : value,
			])
			.sort(([left], [right]) => left.localeCompare(right)),
	}
}

function getPathParamInput({ entries }: PositionedPathParam) {
	return Object.fromEntries(entries)
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

	// Params recorded at index -1 were applied on the root proxy itself
	// (a route like /:tenant/...) — apply them to the client before descending.
	for (const pathParam of pathParams) {
		const { pathIndex } = pathParam
		if (pathIndex === -1 && typeof edenPath === "function") {
			edenPath = (edenPath as (params: unknown) => unknown)(
				getPathParamInput(pathParam),
			)
		}
	}

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

		// Apply path param if one was recorded at this index. Every element of
		// pathSegments is a genuine URL segment — the terminal HTTP method is
		// never part of it — so method-named segments take params like any other.
		for (const pathParam of pathParams) {
			const { pathIndex } = pathParam
			if (pathIndex === i && typeof edenPath === "function") {
				edenPath = (edenPath as (params: unknown) => unknown)(
					getPathParamInput(pathParam),
				)
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
			return edenQueryOptions({
				path: paths,
				input,
				pathParams,
				fetch: async (_inputForKey, signal) => {
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
			if (input === skipToken) {
				throw new TypeError("skipToken is only supported by queryOptions")
			}
			return getQueryKey({
				path: paths,
				input,
				pathParams,
				type: "query",
			})
		},

		queryFilter: (
			input?: unknown,
			filters?: QueryFilters,
		): WithRequired<QueryFilters, "queryKey"> => {
			return {
				...filters,
				queryKey: getQueryKey({
					path: paths,
					input,
					pathParams,
					type: "any",
				}),
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

			return edenInfiniteQueryOptions({
				path: paths,
				input,
				pathParams,
				initialPageParam: initialCursor,
				fetch: async (inputWithCursor, signal) => {
					// Extract the page cursor from the query input.
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
			if (input === skipToken) {
				throw new TypeError(
					"skipToken is only supported by infiniteQueryOptions",
				)
			}
			return getQueryKey({
				path: paths,
				input,
				pathParams,
				type: "infinite",
			})
		},

		infiniteQueryFilter: (
			input?: unknown,
			filters?: QueryFilters,
		): WithRequired<QueryFilters, "queryKey"> => {
			return {
				...filters,
				queryKey: getQueryKey({
					path: paths,
					input,
					pathParams,
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
 * Names reserved for procedure members. On the wrong kind of procedure they
 * resolve to undefined instead of becoming path segments, so introspection
 * like `eden.users.get.mutationOptions === undefined` keeps working.
 */
const PROCEDURE_MEMBERS = new Set([
	"queryOptions",
	"queryKey",
	"queryFilter",
	"infiniteQueryOptions",
	"infiniteQueryKey",
	"infiniteQueryFilter",
	"mutationOptions",
	"mutationKey",
	"~types",
	"body",
	"headers",
	"query",
	"params",
	"cookie",
	"response",
])

/**
 * Properties the host environment probes on arbitrary values. On procedure
 * objects they stay absent instead of becoming child routes.
 */
const HOST_PROBES = new Set(["toJSON", "$$typeof"])

/**
 * Resolve a child property of a path node: HTTP-method names become
 * procedures (still usable as segments — see createProcedureProxy), everything
 * else extends the path.
 */
function resolveChild<TApp extends AnyElysia>(
	opts: CreateEdenOptionsProxyOptions<TApp>,
	paths: string[],
	pathParams: PositionedPathParam[],
	prop: string,
): unknown {
	const { client } = opts

	if (isQueryMethod(prop)) {
		const nextPaths = [...paths, prop]
		return createProcedureProxy(
			createQueryProcedure({
				client,
				paths: nextPaths,
				pathParams: [...pathParams],
			}),
			opts,
			nextPaths,
			[...pathParams],
		)
	}

	if (isMutationMethod(prop)) {
		const nextPaths = [...paths, prop]
		return createProcedureProxy(
			createMutationProcedure({
				client,
				paths: nextPaths,
				pathParams: [...pathParams],
			}),
			opts,
			nextPaths,
			[...pathParams],
		)
	}

	return createEdenOptionsProxy(opts, [...paths, prop], [...pathParams])
}

/**
 * Wrap a procedure so a method-named property stays usable as a path segment.
 * `eden.account.delete.mutationOptions()` is DELETE /account, while
 * `eden.account.delete.post.mutationOptions()` is POST /account/delete —
 * the two must never cross-fire into each other's verb or URL.
 */
function createProcedureProxy<TApp extends AnyElysia>(
	procedure: Record<string, unknown>,
	opts: CreateEdenOptionsProxyOptions<TApp>,
	paths: string[],
	pathParams: PositionedPathParam[],
) {
	// The procedure object is the proxy target, so enumeration, `in`, property
	// descriptors and string coercion keep behaving like the plain object this
	// used to be. Only unknown properties are redirected into the path.
	return new Proxy(procedure, {
		get: (target, prop, receiver) => {
			if (Object.hasOwn(target, prop)) {
				return Reflect.get(target, prop, receiver)
			}

			if (typeof prop === "symbol" || prop === "then") {
				return undefined
			}

			// Members of the other procedure kind stay absent; inherited
			// Object.prototype members (toString, valueOf, …) and host probes
			// must not turn into path segments.
			if (
				PROCEDURE_MEMBERS.has(prop) ||
				HOST_PROBES.has(prop) ||
				prop in Object.prototype
			) {
				return Reflect.get(target, prop, receiver)
			}

			// A method-named element that is really a path segment: keep
			// resolving children from it.
			return resolveChild(opts, paths, pathParams, prop)
		},
	})
}

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
	// Using function as proxy target to support both property access and function calls.
	// This enables: eden.api.users({ id }).get.queryOptions()
	const proxy = new Proxy(function edenProxy() {}, {
		get: (_target, prop: string) => {
			// Prevent promise auto-unwrapping when proxy is used in async context.
			// e.g., `await eden` would try to access `.then` which we don't support.
			if (typeof prop === "symbol" || prop === "then") {
				return undefined
			}

			// HTTP-method names become procedures, everything else extends the
			// path (immutable spread to prevent race conditions).
			return resolveChild(opts, paths, pathParams, prop)
		},

		apply: (_target, _thisArg, args) => {
			// Function call = path params
			// e.g., eden.api.users({ id: '1' }) → adds path param
			// Record the current path index so params are applied at the correct position
			const params =
				args && args.length > 0 && args[0] !== undefined
					? (args[0] as Record<string, unknown>)
					: {}
			const positionedPathParam = capturePathParam(paths.length - 1, params)
			return createEdenOptionsProxy(
				opts,
				[...paths],
				[...pathParams, positionedPathParam],
			)
		},
	})

	return proxy as unknown as EdenOptionsProxy<TApp>
}
