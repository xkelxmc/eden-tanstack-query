/**
 * Decorator types that add TanStack Query methods (queryOptions, mutationOptions, etc.)
 * to Elysia routes.
 */
import type {
	DataTag,
	DefinedInitialDataInfiniteOptions,
	DefinedInitialDataOptions,
	InfiniteData,
	QueryFilters,
	SkipToken,
	UndefinedInitialDataInfiniteOptions,
	UndefinedInitialDataOptions,
	UnusedSkipTokenInfiniteOptions,
	UnusedSkipTokenOptions,
	UseMutationOptions,
} from "@tanstack/react-query"
import type { AnyElysia, RouteSchema } from "elysia"

import type { EdenMutationKey, EdenQueryKey } from "../keys/types"
import type { DeepPartial, EmptyToVoid, Simplify } from "../utils/types"
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

// Re-export key types for convenience
export type {
	EdenMutationKey,
	EdenQueryKey,
	EdenQueryKeyMeta,
	QueryType,
} from "../keys/types"

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
 * Passes TQueryFnData and TData separately for proper type inference with select().
 */
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
 * Passes TQueryFnData and TData separately for proper type inference with select().
 */
interface DefinedEdenQueryOptionsOut<TQueryFnData, TData, TError>
	extends DefinedInitialDataOptions<TQueryFnData, TError, TData, EdenQueryKey>,
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
 * Passes TQueryFnData and TData separately for proper type inference with select().
 */
interface UnusedSkipTokenEdenQueryOptionsOut<TQueryFnData, TData, TError>
	extends UnusedSkipTokenOptions<TQueryFnData, TError, TData, EdenQueryKey>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, TData, TError>
}

/**
 * Query options function type with overloads for different scenarios:
 * 1. With initialData - data is never undefined
 * 2. Without skipToken but no initialData (input required for proper overload resolution)
 * 3. With skipToken or undefined input
 *
 * Follows tRPC's pattern where the second overload has required input
 * to help TypeScript properly select the right overload.
 */
export interface EdenQueryOptions<TDef extends RouteDefinition> {
	/**
	 * Create query options with defined initial data.
	 * The returned data will never be undefined.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input: EmptyToVoid<TDef["input"]> | SkipToken,
		opts: DefinedEdenQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>
		>,
	): DefinedEdenQueryOptionsOut<
		TQueryFnData,
		TData,
		EdenFetchError<number, TDef["error"]>
	>

	/**
	 * Create query options without skipToken.
	 * Input is required (use void for routes without input).
	 * The returned data can be undefined until loaded.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input: EmptyToVoid<TDef["input"]>,
		opts?: UnusedSkipTokenEdenQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>
		>,
	): UnusedSkipTokenEdenQueryOptionsOut<
		TQueryFnData,
		TData,
		EdenFetchError<number, TDef["error"]>
	>

	/**
	 * Create query options with skipToken support.
	 * Use skipToken to conditionally disable the query.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input?: EmptyToVoid<TDef["input"]> | SkipToken,
		opts?: UndefinedEdenQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>
		>,
	): UndefinedEdenQueryOptionsOut<
		TQueryFnData,
		TData,
		EdenFetchError<number, TDef["error"]>
	>
}

// ============================================================================
// Mutation Options Types
// ============================================================================

/**
 * Eden mutation function that supports optional input when empty.
 * Uses EmptyToVoid to allow calling without arguments when input is void/empty.
 */
export type EdenMutationFunction<TOutput, TInput> = (
	input: EmptyToVoid<TInput>,
) => Promise<TOutput>

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
 * mutationFn is guaranteed to be defined.
 * Uses EmptyToVoid<TInput> so mutate() can be called without args when input is empty.
 */
interface EdenMutationOptionsOut<TInput, TError, TOutput, TContext>
	extends UseMutationOptions<TOutput, TError, EmptyToVoid<TInput>, TContext>,
		EdenQueryOptionsResult {
	mutationKey: EdenMutationKey
	mutationFn: EdenMutationFunction<TOutput, TInput>
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

/** Reserved options that are set by the library for infinite queries */
type ReservedInfiniteQueryOptions =
	| "queryKey"
	| "queryFn"
	| "queryHashFn"
	| "queryHash"
	| "initialPageParam"

/**
 * Input options for undefined initial data infinite queries.
 */
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
			ReservedInfiniteQueryOptions
		>,
		EdenQueryBaseOptions {
	initialCursor?: TPageParam
}

/**
 * Output options for undefined initial data infinite queries.
 * TData is the final data type (InfiniteData<TQueryFnData, TPageParam> by default).
 */
interface UndefinedEdenInfiniteQueryOptionsOut<
	TQueryFnData,
	TData,
	TError,
	TPageParam,
> extends UndefinedInitialDataInfiniteOptions<
			TQueryFnData,
			TError,
			InfiniteData<TData, TPageParam>,
			EdenQueryKey,
			TPageParam
		>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, InfiniteData<TData, TPageParam>, TError>
	initialPageParam: TPageParam
}

/**
 * Input options for defined initial data infinite queries.
 */
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
			ReservedInfiniteQueryOptions
		>,
		EdenQueryBaseOptions {
	initialCursor?: TPageParam
}

/**
 * Output options for defined initial data infinite queries.
 * TData is the final data type (InfiniteData<TQueryFnData, TPageParam> by default).
 */
interface DefinedEdenInfiniteQueryOptionsOut<
	TQueryFnData,
	TData,
	TError,
	TPageParam,
> extends DefinedInitialDataInfiniteOptions<
			TQueryFnData,
			TError,
			InfiniteData<TData, TPageParam>,
			EdenQueryKey,
			TPageParam
		>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, InfiniteData<TData, TPageParam>, TError>
	initialPageParam: TPageParam
}

/**
 * Input options when skipToken is not used for infinite queries.
 */
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
			ReservedInfiniteQueryOptions
		>,
		EdenQueryBaseOptions {
	initialCursor?: TPageParam
}

/**
 * Output options when skipToken is not used for infinite queries.
 * TData is the final data type (InfiniteData<TQueryFnData, TPageParam> by default).
 */
interface UnusedSkipTokenEdenInfiniteQueryOptionsOut<
	TQueryFnData,
	TData,
	TError,
	TPageParam,
> extends UnusedSkipTokenInfiniteOptions<
			TQueryFnData,
			TError,
			InfiniteData<TData, TPageParam>,
			EdenQueryKey,
			TPageParam
		>,
		EdenQueryOptionsResult {
	queryKey: DataTag<EdenQueryKey, InfiniteData<TData, TPageParam>, TError>
	initialPageParam: TPageParam
}

/**
 * Infinite query options function type.
 * Only available for routes where input has a `cursor` property.
 */
export interface EdenInfiniteQueryOptions<TDef extends RouteDefinition> {
	/**
	 * Create infinite query options with defined initial data.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = TQueryFnData,
		TPageParam = ExtractCursorType<TDef["input"]> | null,
	>(
		input: EmptyToVoid<Omit<TDef["input"], "cursor">> | SkipToken,
		opts: DefinedEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>,
			TPageParam
		>,
	): DefinedEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		EdenFetchError<number, TDef["error"]>,
		TPageParam
	>

	/**
	 * Create infinite query options without skipToken.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = TQueryFnData,
		TPageParam = ExtractCursorType<TDef["input"]> | null,
	>(
		input: EmptyToVoid<Omit<TDef["input"], "cursor">>,
		opts: UnusedSkipTokenEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>,
			TPageParam
		>,
	): UnusedSkipTokenEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		EdenFetchError<number, TDef["error"]>,
		TPageParam
	>

	/**
	 * Create infinite query options with skipToken support.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = TQueryFnData,
		TPageParam = ExtractCursorType<TDef["input"]> | null,
	>(
		input?: EmptyToVoid<Omit<TDef["input"], "cursor">> | SkipToken,
		opts?: UndefinedEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			EdenFetchError<number, TDef["error"]>,
			TPageParam
		>,
	): UndefinedEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		EdenFetchError<number, TDef["error"]>,
		TPageParam
	>
}

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
 * Adds queryOptions, queryKey, queryFilter.
 * For infinite queries, see DecorateInfiniteQueryProcedure (added conditionally via DecorateRoute).
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
// Path Parameter Extraction
// ============================================================================

/**
 * Extract keys that represent path parameters (start with ':').
 *
 * @example
 * type Params = ExtractRouteParams<{ ':id': {...}, get: {...} }>
 * // { ':id': {...} }
 */
export type ExtractRouteParams<T> = {
	[K in keyof T as K extends `:${string}` ? K : never]: T[K]
}

/**
 * Create input object for path parameters.
 *
 * @example
 * type Input = RouteParamsInput<{ ':id': {...}, ':slug': {...} }>
 * // { id: string | number; slug: string | number }
 */
export type RouteParamsInput<T> = {
	[K in keyof T as K extends `:${infer TParam}` ? TParam : never]:
		| string
		| number
}

// ============================================================================
// App Decoration
// ============================================================================

/**
 * Handle regular path segments (excluding path parameters).
 *
 * @template TRoutes - Current level of routes being processed
 * @template TRouteParams - Keys that are path parameters
 */
type DecoratePathSegments<
	TRoutes extends Record<string, unknown>,
	TRouteParams = ExtractRouteParams<TRoutes>,
> = {
	[K in Exclude<
		keyof TRoutes,
		keyof TRouteParams
	>]: TRoutes[K] extends RouteSchema
		? DecorateRoute<TRoutes[K], K & string>
		: TRoutes[K] extends Record<string, unknown>
			? TRoutes[K] extends Record<string, RouteSchema>
				? DecoratedRouteMethods<TRoutes[K]>
				: DecorateRoutes<TRoutes[K]>
			: never
}

/**
 * Handle path parameters by creating a callable function.
 *
 * @template TRoutes - Current level of routes being processed
 * @template TRouteParams - Keys that are path parameters
 */
type DecoratePathParams<
	TRoutes extends Record<string, unknown>,
	TRouteParams = ExtractRouteParams<TRoutes>,
	// biome-ignore lint/complexity/noBannedTypes: {} check is standard pattern for empty object
> = {} extends TRouteParams
	? // biome-ignore lint/complexity/noBannedTypes: Returns empty intersection when no path params
		{}
	: (
			params: RouteParamsInput<TRouteParams>,
		) => TRoutes[Extract<keyof TRouteParams, keyof TRoutes>] extends Record<
			string,
			unknown
		>
			? DecorateRoutes<TRoutes[Extract<keyof TRouteParams, keyof TRoutes>]>
			: never

/**
 * Recursively decorate all routes in an app's route tree.
 *
 * Handles:
 * - Regular path segments → nested objects
 * - Path parameters (:id) → callable functions
 * - HTTP methods → decorated procedures
 */
export type DecorateRoutes<TRoutes extends Record<string, unknown>> =
	DecoratePathSegments<TRoutes> & DecoratePathParams<TRoutes>

/**
 * Full decorated options proxy type for an Elysia app.
 *
 * @example
 * const app = new Elysia()
 *   .get('/users', () => [...])
 *   .get('/users/:id', ({ params }) => {...})
 *   .post('/users', ({ body }) => { ... })
 *
 * type Proxy = EdenOptionsProxy<typeof app>
 * // Proxy.users.get.queryOptions(...)
 * // Proxy.users({ id: '1' }).get.queryOptions(...)
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
		| DecorateQueryProcedure<RouteDefinition>
		| DecorateMutationProcedure<RouteDefinition>
		| DecorateInfiniteQueryProcedure<RouteDefinition>,
> = TProcedure["~types"]["input"]

/**
 * Infer output type from a decorated procedure.
 *
 * @example
 * type Output = inferOutput<typeof api.users.get>
 */
export type inferOutput<
	TProcedure extends
		| DecorateQueryProcedure<RouteDefinition>
		| DecorateMutationProcedure<RouteDefinition>
		| DecorateInfiniteQueryProcedure<RouteDefinition>,
> = TProcedure["~types"]["output"]

/**
 * Infer error type from a decorated procedure.
 *
 * @example
 * type Error = inferError<typeof api.users.get>
 */
export type inferError<
	TProcedure extends
		| DecorateQueryProcedure<RouteDefinition>
		| DecorateMutationProcedure<RouteDefinition>
		| DecorateInfiniteQueryProcedure<RouteDefinition>,
> = TProcedure["~types"]["error"]
