/**
 * Decorator types that add TanStack Query methods (queryOptions, mutationOptions, etc.)
 * to Elysia routes.
 */
import type {
	DataTag,
	DefinedInitialDataOptions,
	QueryFilters,
	SkipToken,
	UndefinedInitialDataOptions,
	UnusedSkipTokenOptions,
	UseMutationOptions,
} from "@tanstack/react-query"
import type { AnyElysia, RouteSchema } from "elysia"

import type { DeepPartial, Simplify } from "../utils/types"
import type {
	EdenFetchError,
	ExtractRoutes,
	HttpMutationMethod,
	HttpQueryMethod,
	InferRouteError,
	InferRouteInput,
	InferRouteOutput,
	RouteDefinition,
} from "./infer"

// ============================================================================
// Query Key Types
// ============================================================================

/** Query type discriminator for cache key organization */
export type QueryType = "any" | "infinite" | "query"

/**
 * Eden Query Key structure.
 * Format: [path[], { input?, type? }?]
 *
 * @example
 * // Simple query
 * [['users', 'get']]
 *
 * // Query with input
 * [['users', 'get'], { input: { id: '123' } }]
 *
 * // Infinite query
 * [['users', 'list'], { input: { limit: 10 }, type: 'infinite' }]
 */
export type EdenQueryKey = [
	path: string[],
	opts?: { input?: unknown; type?: Exclude<QueryType, "any"> },
]

/**
 * Eden Mutation Key structure.
 * Format: [path[]]
 */
export type EdenMutationKey = [path: string[]]

// ============================================================================
// Query Options Types
// ============================================================================

/** Reserved options that are set by the library, not the user */
type ReservedQueryOptions = "queryKey" | "queryFn" | "queryHashFn" | "queryHash"

/** Reserved mutation options that are set by the library */
type ReservedMutationOptions = "mutationKey" | "mutationFn"

/** Base options for Eden requests */
export interface EdenQueryBaseOptions {
	/**
	 * Eden-specific request options
	 */
	eden?: {
		/**
		 * Abort request on component unmount
		 */
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
 * Input options for undefined initial data queries.
 * Used when no initialData is provided.
 */
interface UndefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UndefinedInitialDataOptions<TQueryFnData, TError, TData, EdenQueryKey>,
			ReservedQueryOptions
		>,
		EdenQueryBaseOptions {}

/**
 * Output options with undefined initial data.
 */
interface UndefinedEdenQueryOptionsOut<TOutput, TError>
	extends UndefinedInitialDataOptions<TOutput, TError, TOutput, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TOutput, TError>
}

/**
 * Input options for defined initial data queries.
 * Used when initialData is provided.
 */
interface DefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			DefinedInitialDataOptions<
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey
			>,
			ReservedQueryOptions
		>,
		EdenQueryBaseOptions {}

/**
 * Output options with defined initial data.
 */
interface DefinedEdenQueryOptionsOut<TData, TError>
	extends DefinedInitialDataOptions<TData, TError, TData, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TData, TError>
}

/**
 * Input options when skipToken is not used.
 */
interface UnusedSkipTokenEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UnusedSkipTokenOptions<TQueryFnData, TError, TData, EdenQueryKey>,
			ReservedQueryOptions
		>,
		EdenQueryBaseOptions {}

/**
 * Output options when skipToken is not used.
 */
interface UnusedSkipTokenEdenQueryOptionsOut<TOutput, TError>
	extends UnusedSkipTokenOptions<TOutput, TError, TOutput, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TOutput, TError>
}

/**
 * Query options function type with overloads for different scenarios:
 * 1. With initialData - data is never undefined
 * 2. Without skipToken but no initialData
 * 3. With skipToken or undefined input
 */
export interface EdenQueryOptions<TDef extends RouteDefinition> {
	/**
	 * Create query options with defined initial data.
	 * The returned data will never be undefined.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input: TDef["input"] | SkipToken,
		opts: DefinedEdenQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>
		>,
	): DefinedEdenQueryOptionsOut<TData, EdenFetchError<number, TDef["error"]>>

	/**
	 * Create query options without skipToken.
	 * The returned data can be undefined until loaded.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input: TDef["input"],
		opts?: UnusedSkipTokenEdenQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>
		>,
	): UnusedSkipTokenEdenQueryOptionsOut<
		TData,
		EdenFetchError<number, TDef["error"]>
	>

	/**
	 * Create query options with skipToken support.
	 * Use skipToken to conditionally disable the query.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input: TDef["input"] | SkipToken,
		opts?: UndefinedEdenQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>
		>,
	): UndefinedEdenQueryOptionsOut<TData, EdenFetchError<number, TDef["error"]>>
}

// ============================================================================
// Mutation Options Types
// ============================================================================

/**
 * Input options for mutations.
 */
type EdenMutationOptionsIn<TInput, TError, TOutput, TContext> = Omit<
	UseMutationOptions<TOutput, TError, TInput, TContext>,
	ReservedMutationOptions
> &
	EdenQueryBaseOptions

/**
 * Output options for mutations.
 */
interface EdenMutationOptionsOut<TInput, TError, TOutput, TContext>
	extends UseMutationOptions<TOutput, TError, TInput, TContext>,
		EdenQueryOptionsResult {
	mutationKey: EdenMutationKey
}

/**
 * Mutation options function type.
 */
export type EdenMutationOptions<TDef extends RouteDefinition> = <
	TContext = unknown,
>(
	opts?: EdenMutationOptionsIn<
		TDef["input"],
		EdenFetchError<number, TDef["error"]>,
		TDef["output"],
		TContext
	>,
) => EdenMutationOptionsOut<
	TDef["input"],
	EdenFetchError<number, TDef["error"]>,
	TDef["output"],
	TContext
>

// ============================================================================
// Infinite Query Types
// ============================================================================

/** Extract cursor type from input that has a cursor property */
export type ExtractCursorType<TInput> = TInput extends {
	cursor?: infer TCursor
}
	? TCursor
	: unknown

/** Cursor input shape */
type CursorInput = { cursor?: unknown }

/** Check if input has optional cursor */
export type HasCursorInput<TInput> = TInput extends CursorInput ? true : false

// Note: Full infinite query options implementation will be in task 3.4
// For now, we define the interface shape

/**
 * Infinite query options function type.
 * Only available for routes where input has a `cursor` property.
 */
export type EdenInfiniteQueryOptions<TDef extends RouteDefinition> = <
	TData = TDef["output"],
>(
	input: Omit<TDef["input"], "cursor">,
	opts: {
		getNextPageParam: (
			lastPage: TDef["output"],
		) => ExtractCursorType<TDef["input"]> | undefined
		getPreviousPageParam?: (
			firstPage: TDef["output"],
		) => ExtractCursorType<TDef["input"]> | undefined
		initialCursor?: ExtractCursorType<TDef["input"]>
	} & EdenQueryBaseOptions,
) => UndefinedEdenQueryOptionsOut<TData, EdenFetchError<number, TDef["error"]>>

// ============================================================================
// Procedure Decorators
// ============================================================================

/** Helper for internal type access */
interface TypeHelper<TDef extends RouteDefinition> {
	/**
	 * @internal Access to raw types for inference utilities
	 */
	"~types": {
		input: TDef["input"]
		output: TDef["output"]
		error: TDef["error"]
	}
}

/** Helper type to make some properties required */
type WithRequired<TObj, TKey extends keyof TObj> = TObj & {
	[P in TKey]-?: TObj[P]
}

/**
 * Decorator for query procedures (GET, OPTIONS, HEAD).
 * Adds queryOptions, queryKey, queryFilter, and optionally infiniteQueryOptions.
 */
export interface DecorateQueryProcedure<TDef extends RouteDefinition>
	extends TypeHelper<TDef> {
	/**
	 * Create type-safe query options for useQuery, prefetchQuery, etc.
	 *
	 * @see https://tanstack.com/query/latest/docs/framework/react/reference/queryOptions
	 */
	queryOptions: EdenQueryOptions<TDef>

	/**
	 * Generate a query key for cache operations.
	 *
	 * @param input - Optional partial input to include in the key
	 * @returns A tagged query key with type information
	 *
	 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
	 */
	queryKey: (
		input?: DeepPartial<TDef["input"]>,
	) => DataTag<
		EdenQueryKey,
		TDef["output"],
		EdenFetchError<number, TDef["error"]>
	>

	/**
	 * Create a query filter for invalidation, cancellation, etc.
	 *
	 * @param input - Optional partial input to filter by
	 * @param filters - Additional filter options
	 * @returns Query filters with queryKey pre-set
	 *
	 * @see https://tanstack.com/query/latest/docs/framework/react/guides/filters
	 */
	queryFilter: (
		input?: DeepPartial<TDef["input"]>,
		filters?: QueryFilters<
			DataTag<
				EdenQueryKey,
				TDef["output"],
				EdenFetchError<number, TDef["error"]>
			>
		>,
	) => WithRequired<
		QueryFilters<
			DataTag<
				EdenQueryKey,
				TDef["output"],
				EdenFetchError<number, TDef["error"]>
			>
		>,
		"queryKey"
	>
}

/**
 * Decorator for query procedures that support infinite queries.
 * Added when input has a `cursor` property.
 */
export interface DecorateInfiniteQueryProcedure<TDef extends RouteDefinition>
	extends TypeHelper<TDef> {
	/**
	 * Create type-safe infinite query options for useInfiniteQuery.
	 *
	 * @see https://tanstack.com/query/latest/docs/framework/react/reference/infiniteQueryOptions
	 */
	infiniteQueryOptions: EdenInfiniteQueryOptions<TDef>

	/**
	 * Generate an infinite query key for cache operations.
	 */
	infiniteQueryKey: (
		input?: DeepPartial<Omit<TDef["input"], "cursor">>,
	) => DataTag<
		EdenQueryKey,
		TDef["output"],
		EdenFetchError<number, TDef["error"]>
	>

	/**
	 * Create an infinite query filter.
	 */
	infiniteQueryFilter: (
		input?: DeepPartial<Omit<TDef["input"], "cursor">>,
		filters?: QueryFilters<
			DataTag<
				EdenQueryKey,
				TDef["output"],
				EdenFetchError<number, TDef["error"]>
			>
		>,
	) => WithRequired<
		QueryFilters<
			DataTag<
				EdenQueryKey,
				TDef["output"],
				EdenFetchError<number, TDef["error"]>
			>
		>,
		"queryKey"
	>
}

/**
 * Decorator for mutation procedures (POST, PUT, PATCH, DELETE).
 * Adds mutationOptions and mutationKey.
 */
export interface DecorateMutationProcedure<TDef extends RouteDefinition>
	extends TypeHelper<TDef> {
	/**
	 * Create type-safe mutation options for useMutation.
	 *
	 * @see https://tanstack.com/query/latest/docs/framework/react/reference/useMutation
	 */
	mutationOptions: EdenMutationOptions<TDef>

	/**
	 * Generate a mutation key for cache operations.
	 *
	 * @returns A mutation key for this procedure
	 */
	mutationKey: () => EdenMutationKey
}

// ============================================================================
// Route Decoration
// ============================================================================

/**
 * Extract RouteDefinition from an Elysia RouteSchema and HTTP method.
 */
export type ExtractRouteDef<
	TRoute extends RouteSchema,
	TMethod extends string,
> = {
	input: InferRouteInput<TRoute, TMethod>
	output: InferRouteOutput<TRoute>
	error: InferRouteError<TRoute>
}

/**
 * Decorate a route based on HTTP method.
 *
 * - GET/HEAD/OPTIONS -> DecorateQueryProcedure (+ DecorateInfiniteQueryProcedure if cursor input)
 * - POST/PUT/PATCH/DELETE -> DecorateMutationProcedure
 */
export type DecorateRoute<
	TRoute extends RouteSchema,
	TMethod extends string,
> = TMethod extends HttpQueryMethod
	? DecorateQueryProcedure<ExtractRouteDef<TRoute, TMethod>> &
			(ExtractRouteDef<TRoute, TMethod>["input"] extends CursorInput
				? DecorateInfiniteQueryProcedure<ExtractRouteDef<TRoute, TMethod>>
				: unknown)
	: TMethod extends HttpMutationMethod
		? DecorateMutationProcedure<ExtractRouteDef<TRoute, TMethod>>
		: never

/**
 * Decorate all methods of a route path.
 *
 * @example
 * type UserRoute = DecoratedRouteMethods<{ get: RouteSchema; post: RouteSchema }>
 * // { get: DecorateQueryProcedure<...>; post: DecorateMutationProcedure<...> }
 */
export type DecoratedRouteMethods<
	TRouteMethods extends Record<string, RouteSchema>,
> = {
	[TMethod in keyof TRouteMethods]: TMethod extends string
		? DecorateRoute<TRouteMethods[TMethod], TMethod>
		: never
}

// ============================================================================
// App Decoration
// ============================================================================

/**
 * Recursively decorate all routes in an app's route tree.
 *
 * Handles nested route structures:
 * - If value is a RouteSchema, decorate it
 * - If value is a nested object, recurse
 */
export type DecorateRoutes<TRoutes extends Record<string, unknown>> = {
	[TPath in keyof TRoutes]: TRoutes[TPath] extends Record<string, unknown>
		? TRoutes[TPath] extends RouteSchema
			? never // Single RouteSchema at this level shouldn't happen
			: TRoutes[TPath] extends Record<string, RouteSchema>
				? DecoratedRouteMethods<TRoutes[TPath]>
				: DecorateRoutes<TRoutes[TPath]>
		: never
}

/**
 * Full decorated options proxy type for an Elysia app.
 *
 * @example
 * const app = new Elysia()
 *   .get('/users', () => [...])
 *   .post('/users', ({ body }) => { ... })
 *
 * type Proxy = EdenOptionsProxy<typeof app>
 * // Proxy.users.get.queryOptions(...)
 * // Proxy.users.post.mutationOptions(...)
 */
export type EdenOptionsProxy<TApp extends AnyElysia> = Simplify<
	DecorateRoutes<ExtractRoutes<TApp>>
>

// ============================================================================
// Type Inference Utilities
// ============================================================================

/**
 * Infer input type from a decorated procedure.
 *
 * @example
 * type Input = inferInput<typeof api.users.get>
 */
export type inferInput<
	TProcedure extends
		| DecorateQueryProcedure<any>
		| DecorateMutationProcedure<any>
		| DecorateInfiniteQueryProcedure<any>,
> = TProcedure["~types"]["input"]

/**
 * Infer output type from a decorated procedure.
 *
 * @example
 * type Output = inferOutput<typeof api.users.get>
 */
export type inferOutput<
	TProcedure extends
		| DecorateQueryProcedure<any>
		| DecorateMutationProcedure<any>
		| DecorateInfiniteQueryProcedure<any>,
> = TProcedure["~types"]["output"]

/**
 * Infer error type from a decorated procedure.
 *
 * @example
 * type Error = inferError<typeof api.users.get>
 */
export type inferError<
	TProcedure extends
		| DecorateQueryProcedure<any>
		| DecorateMutationProcedure<any>
		| DecorateInfiniteQueryProcedure<any>,
> = TProcedure["~types"]["error"]
