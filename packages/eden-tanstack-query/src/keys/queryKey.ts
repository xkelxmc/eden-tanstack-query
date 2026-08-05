import { skipToken } from "@tanstack/react-query"
import type {
	EdenMutationKey,
	EdenQueryKey,
	EdenQueryKeyPathParam,
	QueryType,
} from "./types"

/**
 * Helper to check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

/**
 * Sanitizes input to prevent prototype pollution attacks.
 */
function sanitizeInput(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sanitizeInput)
	}

	// Preserve non-plain objects (e.g. Date, Map, Set, class instances) as-is.
	// Only plain objects are reconstructed for dangerous-key stripping.
	if (!isPlainObject(value)) {
		return value
	}

	const result: Record<string, unknown> = {}
	for (const key of Object.keys(value)) {
		if (key === "__proto__") continue
		result[key] = sanitizeInput(value[key])
	}
	return result
}

/**
 * Options for generating a query key
 */
export interface GetQueryKeyOptions {
	/** Path segments (e.g., ['api', 'users', 'get']) */
	path: string[]
	/** Optional input parameters */
	input?: unknown
	/** Ordered path-parameter applications */
	pathParams?: EdenQueryKeyPathParam[]
	/** Query type: 'query', 'infinite', or 'any' */
	type?: QueryType
}

/**
 * Generates a query key for TanStack Query.
 *
 * The key structure is: [path[], metadata?]
 * - path: Array of route path segments
 * - metadata: Optional object with input and type
 *
 * @example
 * // Path only
 * getQueryKey({ path: ['users', 'get'] })
 * // => [['users', 'get']]
 *
 * // With input
 * getQueryKey({ path: ['users', 'get'], input: { id: '1' } })
 * // => [['users', 'get'], { input: { id: '1' } }]
 *
 * // Infinite query
 * getQueryKey({ path: ['posts', 'list'], input: { limit: 10 }, type: 'infinite' })
 * // => [['posts', 'list'], { input: { limit: 10 }, type: 'infinite' }]
 */
export function getQueryKey(opts: GetQueryKeyOptions): EdenQueryKey {
	const { path, type } = opts
	const pathParams = sanitizeInput(opts.pathParams)
	const hasPathParams = Array.isArray(pathParams) && pathParams.length > 0

	// No input and type is 'any' → just path
	if (
		(opts.input === undefined || opts.input === skipToken) &&
		!hasPathParams &&
		(!type || type === "any")
	) {
		return [path]
	}

	// Sanitize input to prevent prototype pollution
	let input = opts.input === skipToken ? undefined : sanitizeInput(opts.input)

	// The cursor is injected per page, while direction may be user input.
	if (type === "infinite" && isPlainObject(input) && "cursor" in input) {
		const { cursor: _cursor, ...rest } = input
		input = rest
	}

	// Build metadata object
	const meta: Record<string, unknown> = {}

	if (input !== undefined) {
		meta.input = input
	}
	if (hasPathParams) {
		meta.pathParams = pathParams
	}

	if (type && type !== "any") {
		meta.type = type
	}

	// Return with metadata if any, otherwise just path
	return Object.keys(meta).length > 0 ? [path, meta] : [path]
}

/**
 * Options for generating a mutation key
 */
export interface GetMutationKeyOptions {
	/** Path segments (e.g., ['api', 'users', 'post']) */
	path: string[]
}

/**
 * Generates a mutation key for TanStack Query.
 *
 * Mutation keys are simpler than query keys - just the path.
 *
 * @example
 * getMutationKey({ path: ['users', 'post'] })
 * // => [['users', 'post']]
 */
export function getMutationKey(opts: GetMutationKeyOptions): EdenMutationKey {
	return [opts.path]
}
