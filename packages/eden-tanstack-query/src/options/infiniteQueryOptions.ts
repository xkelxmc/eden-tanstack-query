/**
 * Infinite query options factory for TanStack Query integration.
 * Creates type-safe infinite query options from Eden route definitions.
 */
import type {
	DataTag,
	DefinedInitialDataInfiniteOptions,
	QueryFunction,
	SkipToken,
	UndefinedInitialDataInfiniteOptions,
	UnusedSkipTokenInfiniteOptions,
} from "@tanstack/react-query"
import { skipToken } from "@tanstack/react-query"

import { getQueryKey } from "../keys/queryKey"
import type { EdenQueryKey } from "../keys/types"

// ============================================================================
// Input Types
// ============================================================================

/** Reserved options that are set by the library */
type ReservedOptions =
	| "queryKey"
	| "queryFn"
	| "queryHashFn"
	| "queryHash"
	| "initialPageParam"

/** Base options for Eden requests */
interface EdenInfiniteQueryBaseOptions {
	eden?: {
		/** Abort request on component unmount */
		abortOnUnmount?: boolean
	}
}

/** Result metadata added to infinite query options */
export interface EdenInfiniteQueryOptionsResult {
	eden: {
		path: string
	}
}

/**
 * Arguments for creating infinite query options.
 *
 * @template TInput - Input type without cursor (cursor is handled separately)
 * @template TOutput - Output type from the query
 * @template TPageParam - Type of the cursor/page parameter
 */
export interface EdenInfiniteQueryOptionsArgs<TInput, TOutput, TPageParam> {
	/** Path segments (e.g., ['api', 'posts', 'get']) */
	path: string[]
	/** Input parameters (excluding cursor) or skipToken */
	input: TInput | SkipToken
	/** Function to fetch data with cursor */
	fetch: (
		input: TInput & { cursor: TPageParam },
		signal?: AbortSignal,
	) => Promise<TOutput>
	/** Initial page param for first fetch */
	initialPageParam: TPageParam
}

// ============================================================================
// Input Option Types
// ============================================================================

interface UndefinedEdenInfiniteQueryOptionsIn<
	TQueryFnData,
	TData,
	TError,
	TPageParam,
> extends Omit<
			UndefinedInitialDataInfiniteOptions<
				TQueryFnData,
				TError,
				TData,
				EdenQueryKey,
				TPageParam
			>,
			ReservedOptions
		>,
		EdenInfiniteQueryBaseOptions {}

interface DefinedEdenInfiniteQueryOptionsIn<
	TQueryFnData,
	TData,
	TError,
	TPageParam,
> extends Omit<
			DefinedInitialDataInfiniteOptions<
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey,
				TPageParam
			>,
			ReservedOptions
		>,
		EdenInfiniteQueryBaseOptions {}

interface UnusedSkipTokenEdenInfiniteQueryOptionsIn<
	TQueryFnData,
	TData,
	TError,
	TPageParam,
> extends Omit<
			UnusedSkipTokenInfiniteOptions<
				TQueryFnData,
				TError,
				TData,
				EdenQueryKey,
				TPageParam
			>,
			ReservedOptions
		>,
		EdenInfiniteQueryBaseOptions {}

// ============================================================================
// Output Option Types
// ============================================================================

interface UndefinedEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>
	extends UndefinedInitialDataInfiniteOptions<
			TOutput,
			TError,
			TOutput,
			EdenQueryKey,
			TPageParam
		>,
		EdenInfiniteQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TOutput, TError>
}

interface DefinedEdenInfiniteQueryOptionsOut<TData, TError, TPageParam>
	extends DefinedInitialDataInfiniteOptions<
			TData,
			TError,
			TData,
			EdenQueryKey,
			TPageParam
		>,
		EdenInfiniteQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TData, TError>
}

interface UnusedSkipTokenEdenInfiniteQueryOptionsOut<
	TOutput,
	TError,
	TPageParam,
> extends UnusedSkipTokenInfiniteOptions<
			TOutput,
			TError,
			TOutput,
			EdenQueryKey,
			TPageParam
		>,
		EdenInfiniteQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TOutput, TError>
}

// ============================================================================
// Union Types
// ============================================================================

type AnyEdenInfiniteQueryOptionsIn<TQueryFnData, TData, TError, TPageParam> =
	| UndefinedEdenInfiniteQueryOptionsIn<TQueryFnData, TData, TError, TPageParam>
	| DefinedEdenInfiniteQueryOptionsIn<TQueryFnData, TData, TError, TPageParam>
	| UnusedSkipTokenEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			TError,
			TPageParam
	  >

type AnyEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam> =
	| UndefinedEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>
	| DefinedEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>
	| UnusedSkipTokenEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>

// ============================================================================
// Function Overloads
// ============================================================================

/**
 * Create infinite query options with defined initial data.
 * The returned data will never be undefined.
 */
export function edenInfiniteQueryOptions<
	TInput,
	TOutput,
	TError = Error,
	TPageParam = unknown,
>(
	args: EdenInfiniteQueryOptionsArgs<TInput, TOutput, TPageParam> & {
		opts: DefinedEdenInfiniteQueryOptionsIn<
			TOutput,
			TOutput,
			TError,
			TPageParam
		>
	},
): DefinedEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>

/**
 * Create infinite query options without skipToken.
 * The returned data can be undefined until loaded.
 */
export function edenInfiniteQueryOptions<
	TInput,
	TOutput,
	TError = Error,
	TPageParam = unknown,
>(
	args: EdenInfiniteQueryOptionsArgs<TInput, TOutput, TPageParam> & {
		input: TInput
		opts: UnusedSkipTokenEdenInfiniteQueryOptionsIn<
			TOutput,
			TOutput,
			TError,
			TPageParam
		>
	},
): UnusedSkipTokenEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>

/**
 * Create infinite query options with skipToken support.
 * Use skipToken to conditionally disable the query.
 */
export function edenInfiniteQueryOptions<
	TInput,
	TOutput,
	TError = Error,
	TPageParam = unknown,
>(
	args: EdenInfiniteQueryOptionsArgs<TInput, TOutput, TPageParam> & {
		opts: UndefinedEdenInfiniteQueryOptionsIn<
			TOutput,
			TOutput,
			TError,
			TPageParam
		>
	},
): UndefinedEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates TanStack Query infinite query options for an Eden route.
 *
 * @example
 * ```typescript
 * // Server returns: { items: Post[], nextCursor: string | null }
 * const options = edenInfiniteQueryOptions({
 *   path: ['api', 'posts', 'get'],
 *   input: { limit: 10 },
 *   initialPageParam: null as string | null,
 *   fetch: async (input, signal) => {
 *     const result = await edenClient.api.posts.get({
 *       query: { limit: input.limit, cursor: input.cursor },
 *       fetch: { signal }
 *     })
 *     return result.data
 *   },
 *   opts: {
 *     getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
 *   },
 * })
 *
 * // Use with useInfiniteQuery
 * const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(options)
 *
 * // Or prefetch
 * await queryClient.prefetchInfiniteQuery(options)
 * ```
 */
export function edenInfiniteQueryOptions<
	TInput,
	TOutput,
	TError = Error,
	TPageParam = unknown,
>(args: {
	path: string[]
	input: TInput | SkipToken
	fetch: (
		input: TInput & { cursor: TPageParam },
		signal?: AbortSignal,
	) => Promise<TOutput>
	initialPageParam: TPageParam
	opts: AnyEdenInfiniteQueryOptionsIn<TOutput, TOutput, TError, TPageParam>
}): AnyEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam> {
	const { path, input, fetch: fetchFn, initialPageParam, opts } = args

	const inputIsSkipToken = input === skipToken

	const queryKey = getQueryKey({
		path,
		input: inputIsSkipToken ? undefined : input,
		type: "infinite",
	}) as DataTag<EdenQueryKey, TOutput, TError>

	const queryFn: QueryFunction<TOutput, EdenQueryKey, TPageParam> = async (
		context,
	) => {
		const actualInput = input as TInput

		const fullInput = {
			...actualInput,
			cursor: context.pageParam,
		} as TInput & { cursor: TPageParam }

		// Pass abort signal from query context
		// If eden.abortOnUnmount is true, use the signal
		const signal = opts?.eden?.abortOnUnmount ? context.signal : undefined

		return await fetchFn(fullInput, signal)
	}

	// Build result object
	const result = {
		...opts,
		queryKey,
		queryFn: inputIsSkipToken ? skipToken : queryFn,
		initialPageParam,
		eden: {
			path: path.join("."),
		},
	}

	return result as AnyEdenInfiniteQueryOptionsOut<TOutput, TError, TPageParam>
}
