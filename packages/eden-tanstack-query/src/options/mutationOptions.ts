/**
 * Mutation options factory for TanStack Query integration.
 * Creates type-safe mutation options from Eden route definitions.
 */
import type {
	MutationFunction,
	UseMutationOptions,
} from "@tanstack/react-query"

import { getMutationKey } from "../keys/queryKey"
import type { EdenMutationKey } from "../keys/types"
import type { EmptyToVoid } from "../utils/types"

// ============================================================================
// Input Types
// ============================================================================

/** Reserved options that are set by the library */
type ReservedOptions = "mutationKey" | "mutationFn"

/** Result metadata added to mutation options */
export interface EdenMutationOptionsResult {
	eden: {
		path: string
	}
}

// ============================================================================
// Option Types
// ============================================================================

/**
 * Input options for creating mutation options.
 * Omits reserved options that are set by the library.
 */
export type EdenMutationOptionsIn<TOutput, TError, TInput, TContext> = Omit<
	UseMutationOptions<TOutput, TError, TInput, TContext>,
	ReservedOptions
>

/**
 * Output options returned by edenMutationOptions.
 * Includes the mutation key and eden metadata.
 * mutationFn is guaranteed to be defined.
 * Uses EmptyToVoid<TInput> so mutate() can be called without args when input is empty.
 */
export interface EdenMutationOptionsOut<TOutput, TError, TInput, TContext>
	extends UseMutationOptions<TOutput, TError, EmptyToVoid<TInput>, TContext>,
		EdenMutationOptionsResult {
	mutationKey: EdenMutationKey
	mutationFn: MutationFunction<TOutput, EmptyToVoid<TInput>>
}

/**
 * Arguments for creating mutation options.
 */
export interface EdenMutationOptionsArgs<TInput, TOutput, TError, TContext> {
	/** Path segments (e.g., ['api', 'users', 'post']) */
	path: string[]
	/** Function to perform the mutation */
	mutate: (input: TInput) => Promise<TOutput>
	/** Optional mutation options */
	opts?: EdenMutationOptionsIn<TOutput, TError, TInput, TContext>
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates TanStack Query mutation options for an Eden route.
 *
 * @example
 * ```typescript
 * const options = edenMutationOptions({
 *   path: ['api', 'users', 'post'],
 *   mutate: async (input) => {
 *     const response = await edenClient.api.users.post(input)
 *     // Eden does not throw on HTTP errors - rethrow so the mutation errors out
 *     if (response.error) throw response.error
 *     return response.data
 *   },
 *   opts: {
 *     onMutate: (variables) => {
 *       // Called before mutation
 *       return { previousData: [...] } // context
 *     },
 *     onSuccess: (data, variables, context) => {
 *       // Called on success
 *     },
 *     onError: (error, variables, context) => {
 *       // Rollback using context
 *     },
 *     onSettled: (data, error, variables, context) => {
 *       // Always called
 *       queryClient.invalidateQueries({ queryKey: ['users'] })
 *     },
 *   },
 * })
 *
 * // Use with useMutation
 * const mutation = useMutation(options)
 * mutation.mutate({ name: 'John' })
 * ```
 */
export function edenMutationOptions<
	TInput,
	TOutput,
	TError = Error,
	TContext = unknown,
>(
	args: EdenMutationOptionsArgs<TInput, TOutput, TError, TContext>,
): EdenMutationOptionsOut<TOutput, TError, TInput, TContext> {
	const { path, mutate, opts } = args

	const mutationKey = getMutationKey({ path })

	const mutationFn: MutationFunction<TOutput, EmptyToVoid<TInput>> = async (
		input,
		_context,
	) => {
		return await mutate(input as TInput)
	}

	// Cast opts to match EmptyToVoid<TInput> for variables type
	const outputOpts = opts as unknown as Omit<
		UseMutationOptions<TOutput, TError, EmptyToVoid<TInput>, TContext>,
		ReservedOptions
	>

	return {
		...outputOpts,
		mutationKey,
		mutationFn,
		eden: {
			path: path.join("."),
		},
	}
}
