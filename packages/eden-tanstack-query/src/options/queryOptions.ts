/**
 * Query options factory for TanStack Query integration.
 * Creates type-safe query options from Eden route definitions.
 */
import type {
	DataTag,
	DefinedInitialDataOptions,
	QueryFunction,
	SkipToken,
	UndefinedInitialDataOptions,
	UnusedSkipTokenOptions,
} from "@tanstack/react-query"
import { queryOptions, skipToken } from "@tanstack/react-query"

import { getQueryKey } from "../keys/queryKey"
import type { EdenQueryKey } from "../keys/types"

// ============================================================================
// Input Types
// ============================================================================

/** Reserved options that are set by the library */
type ReservedOptions = "queryKey" | "queryFn" | "queryHashFn" | "queryHash"

/** Base options for Eden requests */
interface EdenQueryBaseOptions {
	eden?: {
		/** Abort request on component unmount */
		abortOnUnmount?: boolean
	}
}

/** Result metadata added to query options */
export interface EdenQueryOptionsResult {
	eden: {
		path: string
	}
}

/**
 * Arguments for creating query options.
 */
export interface EdenQueryOptionsArgs<TInput, TOutput> {
	/** Path segments (e.g., ['api', 'users', 'get']) */
	path: string[]
	/** Input parameters or skipToken */
	input: TInput | SkipToken
	/**
	 * Input used for the query key when it differs from `input`, such as when
	 * normalized path params are merged into request input.
	 * When omitted, the key is derived from `input`.
	 */
	inputForKey?: unknown
	/** Additional cache identity kept separate from request input. */
	scopeForKey?: unknown
	/** Function to fetch data */
	fetch: (input: TInput, signal?: AbortSignal) => Promise<TOutput>
}

// ============================================================================
// Input Option Types
// ============================================================================

interface UndefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UndefinedInitialDataOptions<TQueryFnData, TError, TData, EdenQueryKey>,
			ReservedOptions
		>,
		EdenQueryBaseOptions {}

interface DefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			DefinedInitialDataOptions<
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey
			>,
			ReservedOptions
		>,
		EdenQueryBaseOptions {}

interface UnusedSkipTokenEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UnusedSkipTokenOptions<TQueryFnData, TError, TData, EdenQueryKey>,
			ReservedOptions
		>,
		EdenQueryBaseOptions {}

// ============================================================================
// Output Option Types
// ============================================================================

interface UndefinedEdenQueryOptionsOut<TQueryFnData, TData, TError>
	extends UndefinedInitialDataOptions<
			TQueryFnData,
			TError,
			TData,
			EdenQueryKey
		>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TData, TError>
}

interface DefinedEdenQueryOptionsOut<TQueryFnData, TData, TError>
	extends DefinedInitialDataOptions<TQueryFnData, TError, TData, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TData, TError>
}

interface UnusedSkipTokenEdenQueryOptionsOut<TQueryFnData, TData, TError>
	extends UnusedSkipTokenOptions<TQueryFnData, TError, TData, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TData, TError>
}

// ============================================================================
// Union Types
// ============================================================================

type AnyEdenQueryOptionsIn<TQueryFnData, TData, TError> =
	| UndefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	| DefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	| UnusedSkipTokenEdenQueryOptionsIn<TQueryFnData, TData, TError>

type AnyEdenQueryOptionsOut<TQueryFnData, TData, TError> =
	| UndefinedEdenQueryOptionsOut<TQueryFnData, TData, TError>
	| DefinedEdenQueryOptionsOut<TQueryFnData, TData, TError>
	| UnusedSkipTokenEdenQueryOptionsOut<TQueryFnData, TData, TError>

// ============================================================================
// Function Overloads
// ============================================================================

/**
 * Create query options with defined initial data.
 * The returned data will never be undefined.
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(
	args: EdenQueryOptionsArgs<TInput, TOutput> & {
		opts: DefinedEdenQueryOptionsIn<TOutput, TOutput, TError>
	},
): DefinedEdenQueryOptionsOut<TOutput, TOutput, TError>

/**
 * Create query options without skipToken.
 * The returned data can be undefined until loaded.
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(
	args: EdenQueryOptionsArgs<TInput, TOutput> & {
		input: TInput
		opts?: UnusedSkipTokenEdenQueryOptionsIn<TOutput, TOutput, TError>
	},
): UnusedSkipTokenEdenQueryOptionsOut<TOutput, TOutput, TError>

/**
 * Create query options with skipToken support.
 * Use skipToken to conditionally disable the query.
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(
	args: EdenQueryOptionsArgs<TInput, TOutput> & {
		opts?: UndefinedEdenQueryOptionsIn<TOutput, TOutput, TError>
	},
): UndefinedEdenQueryOptionsOut<TOutput, TOutput, TError>

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates TanStack Query options for an Eden route.
 *
 * @example
 * ```typescript
 * const options = edenQueryOptions({
 *   path: ['api', 'users', 'get'],
 *   input: { id: '1' },
 *   fetch: async (input, signal) => {
 *     const response = await edenClient.api.users.get({ query: input, fetch: { signal } })
 *     return response.data
 *   },
 * })
 *
 * // Use with useQuery
 * const { data } = useQuery(options)
 *
 * // Or prefetch
 * await queryClient.prefetchQuery(options)
 * ```
 */
export function edenQueryOptions<TInput, TOutput, TError = Error>(args: {
	path: string[]
	input: TInput | SkipToken
	inputForKey?: unknown
	scopeForKey?: unknown
	fetch: (input: TInput, signal?: AbortSignal) => Promise<TOutput>
	opts?: AnyEdenQueryOptionsIn<TOutput, TOutput, TError>
}): AnyEdenQueryOptionsOut<TOutput, TOutput, TError> {
	const { path, input, scopeForKey, fetch: fetchFn, opts } = args

	const inputIsSkipToken = input === skipToken

	const keyInput = "inputForKey" in args ? args.inputForKey : input

	const queryKey = getQueryKey({
		path,
		input: keyInput === skipToken ? undefined : keyInput,
		scope: scopeForKey,
		type: "query",
	})

	// Use unknown internally - types are enforced by function signature
	const queryFn: QueryFunction<unknown, EdenQueryKey> = async (context) => {
		const actualInput = input as TInput

		// Pass abort signal from query context
		// If eden.abortOnUnmount is true, use the signal
		const signal = opts?.eden?.abortOnUnmount ? context.signal : undefined

		const result = await fetchFn(actualInput, signal)
		return result
	}

	// Extract our custom eden options before passing to queryOptions
	const { eden: _edenOpts, ...tanstackOpts } = opts ?? {}

	const options = inputIsSkipToken
		? { ...tanstackOpts, queryKey, enabled: false }
		: { ...tanstackOpts, queryKey, queryFn }

	// Build result - types are enforced by function overloads
	return Object.assign(
		queryOptions(options as Parameters<typeof queryOptions>[0]),
		{
			eden: {
				path: path.join("."),
			},
		},
	) as AnyEdenQueryOptionsOut<TOutput, TOutput, TError>
}
