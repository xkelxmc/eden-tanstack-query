import { skipToken } from "@tanstack/react-query"
import type { EdenMutationKey, EdenQueryKey, QueryType } from "./types"

/**
 * Helper to check if value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Dangerous keys that could cause prototype pollution
 */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Sanitizes input to prevent prototype pollution attacks.
 * Removes dangerous keys like __proto__, constructor, prototype.
 */
function sanitizeInput(value: unknown): unknown {
	if (!isObject(value)) {
		return Array.isArray(value) ? value.map(sanitizeInput) : value
	}

	const result: Record<string, unknown> = {}
	for (const key of Object.keys(value)) {
		if (!DANGEROUS_KEYS.has(key)) {
			result[key] = sanitizeInput(value[key])
		}
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

	// Handle skipToken - return key without input
	if (opts.input === skipToken) {
		return [path]
	}

	// No input and type is 'any' → just path
	if (opts.input === undefined && (!type || type === "any")) {
		return [path]
	}

	// Sanitize input to prevent prototype pollution
	const input = sanitizeInput(opts.input)

	// For infinite queries, strip cursor/direction from input
	if (type === "infinite" && isObject(input)) {
		const inputObj = input
		if ("cursor" in inputObj || "direction" in inputObj) {
			const { cursor: _, direction: __, ...rest } = inputObj
			return [
				path,
				{
					input: rest,
					type: "infinite",
				},
			]
		}
	}

	// Build metadata object
	const meta: Record<string, unknown> = {}

	if (input !== undefined) {
		meta.input = input
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
