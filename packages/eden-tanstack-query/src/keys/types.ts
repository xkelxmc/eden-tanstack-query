/**
 * Query key types for TanStack Query integration.
 *
 * Query key structure:
 * [path[], metadata?]
 *
 * @example
 * // Simple query
 * [['api', 'users', 'get']]
 *
 * // Query with input
 * [['api', 'users', 'get'], { input: { id: '1' } }]
 *
 * // Infinite query
 * [['api', 'posts', 'get'], { input: { limit: 10 }, type: 'infinite' }]
 */

/**
 * Query type discriminator for cache key organization.
 * - 'query': Standard query
 * - 'infinite': Paginated infinite query
 * - 'any': Wildcard for filtering (matches both)
 */
export type QueryType = "query" | "infinite" | "any"

/**
 * Metadata for query keys.
 * Contains optional input and query type information.
 *
 * @template TInput - The input type for the query
 */
export type EdenQueryKeyMeta<TInput = unknown> = {
	/** Input parameters for the query */
	input?: TInput
	/** Query type discriminator (excludes 'any' as it's only for filtering) */
	type?: Exclude<QueryType, "any">
}

/**
 * Eden Query Key structure.
 * Compatible with TanStack Query's QueryKey type.
 *
 * Format: [path[], metadata?]
 *
 * @template TInput - The input type for type-safe key construction
 *
 * @example
 * // Path-only key (matches all queries at this path)
 * const key1: EdenQueryKey = [['users', 'get']]
 *
 * // Key with input
 * const key2: EdenQueryKey<{ id: string }> = [
 *   ['users', 'get'],
 *   { input: { id: '123' } }
 * ]
 *
 * // Key with type
 * const key3: EdenQueryKey = [
 *   ['posts', 'list'],
 *   { input: { limit: 10 }, type: 'infinite' }
 * ]
 */
export type EdenQueryKey<TInput = unknown> =
	| [path: string[]]
	| [path: string[], meta: EdenQueryKeyMeta<TInput>]

/**
 * Eden Mutation Key structure.
 * Simpler than query keys - just the path.
 *
 * Format: [path[]]
 *
 * @example
 * const mutKey: EdenMutationKey = [['users', 'post']]
 */
export type EdenMutationKey = [path: string[]]
