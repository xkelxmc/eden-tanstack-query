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
 * Per-request headers accepted by Eden query calls.
 */
type EdenRequestHeaders = Record<string, string | undefined>

/**
 * Request-style query input with optional headers.
 * Supports: { query: {...}, headers: {...} }
 */
type EdenQueryRequestInput<TInput> = Simplify<
	({} extends TInput ? { query?: TInput } : { query: TInput }) & {
		headers?: EdenRequestHeaders
	}
>

/**
 * Query input accepted by query methods.
 * Supports:
 * - direct query object: { role: "admin" }
 * - direct query + headers: { role: "admin", headers: {...} }
 * - request shape: { query: { role: "admin" }, headers: {...} }
 */
type EdenQueryProcedureInput<TInput> =
	| TInput
	| Simplify<TInput & { headers?: EdenRequestHeaders }>
	| EdenQueryRequestInput<TInput>

/**
 * Infinite query input without cursor.
 */
type EdenInfiniteQueryBaseInput<TInput> = Omit<TInput, "cursor">

/**
 * Input accepted by infinite query methods.
 */
type EdenInfiniteQueryProcedureInput<TInput> =
	| EdenInfiniteQueryBaseInput<TInput>
	| Simplify<
			EdenInfiniteQueryBaseInput<TInput> & {
				headers?: EdenRequestHeaders
			}
	  >
	| EdenQueryRequestInput<EdenInfiniteQueryBaseInput<TInput>>

/**
 * Input options for undefined initial data queries.
 * Used when no initialData is provided.
 */
interface UndefinedEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UndefinedInitialDataOptions<
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey
			>,
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
	queryKey: DataTag<EdenQueryKey, TQueryFnData, TError>
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
	queryKey: DataTag<EdenQueryKey, TQueryFnData, TError>
}

/**
 * Input options when skipToken is not used.
 */
interface UnusedSkipTokenEdenQueryOptionsIn<TQueryFnData, TData, TError>
	extends Omit<
			UnusedSkipTokenOptions<
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey
			>,
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
	queryKey: DataTag<EdenQueryKey, TQueryFnData, TError>
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
		input: EmptyToVoid<EdenQueryProcedureInput<TDef["input"]>> | SkipToken,
		opts: DefinedEdenQueryOptionsIn<TQueryFnData, TData, TDef["error"]>,
	): DefinedEdenQueryOptionsOut<TQueryFnData, TData, TDef["error"]>

	/**
	 * Create query options without skipToken.
	 * Input is required (use void for routes without input).
	 * The returned data can be undefined until loaded.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input: EmptyToVoid<EdenQueryProcedureInput<TDef["input"]>>,
		opts?: UnusedSkipTokenEdenQueryOptionsIn<
			TQueryFnData,
			TData,
			TDef["error"]
		>,
	): UnusedSkipTokenEdenQueryOptionsOut<TQueryFnData, TData, TDef["error"]>

	/**
	 * Create query options with skipToken support.
	 * Use skipToken to conditionally disable the query.
	 */
	<TQueryFnData extends TDef["output"], TData = TQueryFnData>(
		input?: EmptyToVoid<EdenQueryProcedureInput<TDef["input"]>> | SkipToken,
		opts?: UndefinedEdenQueryOptionsIn<TQueryFnData, TData, TDef["error"]>,
	): UndefinedEdenQueryOptionsOut<TQueryFnData, TData, TDef["error"]>
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
		TDef["error"],
		TDef["output"],
		TContext
	>,
) => EdenMutationOptionsOut<
	TDef["input"],
	TDef["error"],
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

type ExplicitInfinitePageParam<TPageParam> = Exclude<TPageParam, undefined>

type DefaultedInfinitePageParam<TPageParam> =
	ExplicitInfinitePageParam<TPageParam> | null

type DefaultInfinitePageParam<TDef extends RouteDefinition> =
	DefaultedInfinitePageParam<ExtractCursorType<TDef["input"]>>

type DefaultInfiniteData<
	TDef extends RouteDefinition,
	TQueryFnData,
> = InfiniteData<TQueryFnData, DefaultInfinitePageParam<TDef>>

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
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey,
				NoInfer<TPageParam>
			>,
			ReservedInfiniteQueryOptions
		>,
		EdenQueryBaseOptions {}

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
			TData,
			EdenQueryKey,
			TPageParam
		>,
		EdenQueryOptionsResult {
	queryKey: DataTag<
		EdenQueryKey,
		InfiniteData<TQueryFnData, TPageParam>,
		TError
	>
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
				NoInfer<TPageParam>
			>,
			ReservedInfiniteQueryOptions | "initialData"
		>,
		EdenQueryBaseOptions {
	initialData:
		| InfiniteData<NoInfer<TQueryFnData>, NoInfer<TPageParam>>
		| (() => InfiniteData<NoInfer<TQueryFnData>, NoInfer<TPageParam>>)
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
			TData,
			EdenQueryKey,
			TPageParam
		>,
		EdenQueryOptionsResult {
	queryKey: DataTag<
		EdenQueryKey,
		InfiniteData<TQueryFnData, TPageParam>,
		TError
	>
	initialPageParam: TPageParam
	initialData:
		| InfiniteData<TQueryFnData, TPageParam>
		| (() => InfiniteData<TQueryFnData, TPageParam>)
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
				NoInfer<TQueryFnData>,
				TError,
				TData,
				EdenQueryKey,
				NoInfer<TPageParam>
			>,
			ReservedInfiniteQueryOptions
		>,
		EdenQueryBaseOptions {}

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
			TData,
			EdenQueryKey,
			TPageParam
		>,
		EdenQueryOptionsResult {
	queryKey: DataTag<
		EdenQueryKey,
		InfiniteData<TQueryFnData, TPageParam>,
		TError
	>
	initialPageParam: TPageParam
}

/**
 * Infinite query options function type.
 * Only available for routes where input has a `cursor` property.
 */
export interface EdenInfiniteQueryOptions<TDef extends RouteDefinition> {
	/**
	 * Create infinite query options with defined initial data and an explicit cursor.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = InfiniteData<
			TQueryFnData,
			ExplicitInfinitePageParam<ExtractCursorType<TDef["input"]>>
		>,
		TPageParam = ExtractCursorType<TDef["input"]>,
	>(
		input:
			| EmptyToVoid<EdenInfiniteQueryProcedureInput<TDef["input"]>>
			| SkipToken,
		opts: DefinedEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			TDef["error"],
			ExplicitInfinitePageParam<TPageParam>
		> & { initialCursor: ExplicitInfinitePageParam<TPageParam> },
	): DefinedEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		TDef["error"],
		ExplicitInfinitePageParam<TPageParam>
	>

	/**
	 * Create infinite query options with defined initial data and the null default.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = DefaultInfiniteData<TDef, TQueryFnData>,
		TPageParam = ExtractCursorType<TDef["input"]>,
	>(
		input:
			| EmptyToVoid<EdenInfiniteQueryProcedureInput<TDef["input"]>>
			| SkipToken,
		opts: DefinedEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			TDef["error"],
			DefaultedInfinitePageParam<TPageParam>
		> & { initialCursor?: NoInfer<TPageParam> },
	): DefinedEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		TDef["error"],
		DefaultedInfinitePageParam<TPageParam>
	>

	/**
	 * Create infinite query options without skipToken and with an explicit cursor.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = InfiniteData<
			TQueryFnData,
			ExplicitInfinitePageParam<ExtractCursorType<TDef["input"]>>
		>,
		TPageParam = ExtractCursorType<TDef["input"]>,
	>(
		input: EmptyToVoid<EdenInfiniteQueryProcedureInput<TDef["input"]>>,
		opts: UnusedSkipTokenEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			TDef["error"],
			ExplicitInfinitePageParam<TPageParam>
		> & { initialCursor: ExplicitInfinitePageParam<TPageParam> },
	): UnusedSkipTokenEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		TDef["error"],
		ExplicitInfinitePageParam<TPageParam>
	>

	/**
	 * Create infinite query options without skipToken and with the null default.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = DefaultInfiniteData<TDef, TQueryFnData>,
		TPageParam = ExtractCursorType<TDef["input"]>,
	>(
		input: EmptyToVoid<EdenInfiniteQueryProcedureInput<TDef["input"]>>,
		opts: UnusedSkipTokenEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			TDef["error"],
			DefaultedInfinitePageParam<TPageParam>
		> & { initialCursor?: NoInfer<TPageParam> },
	): UnusedSkipTokenEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		TDef["error"],
		DefaultedInfinitePageParam<TPageParam>
	>

	/**
	 * Create infinite query options with skipToken support and an explicit cursor.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = InfiniteData<
			TQueryFnData,
			ExplicitInfinitePageParam<ExtractCursorType<TDef["input"]>>
		>,
		TPageParam = ExtractCursorType<TDef["input"]>,
	>(
		input?:
			| EmptyToVoid<EdenInfiniteQueryProcedureInput<TDef["input"]>>
			| SkipToken,
		opts?: UndefinedEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			TDef["error"],
			ExplicitInfinitePageParam<TPageParam>
		> & { initialCursor: ExplicitInfinitePageParam<TPageParam> },
	): UndefinedEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		TDef["error"],
		ExplicitInfinitePageParam<TPageParam>
	>

	/**
	 * Create infinite query options with skipToken support and the null default.
	 */
	<
		TQueryFnData extends TDef["output"] = TDef["output"],
		TData = DefaultInfiniteData<TDef, TQueryFnData>,
		TPageParam = ExtractCursorType<TDef["input"]>,
	>(
		input?:
			| EmptyToVoid<EdenInfiniteQueryProcedureInput<TDef["input"]>>
			| SkipToken,
		opts?: UndefinedEdenInfiniteQueryOptionsIn<
			TQueryFnData,
			TData,
			TDef["error"],
			DefaultedInfinitePageParam<TPageParam>
		> & { initialCursor?: NoInfer<TPageParam> },
	): UndefinedEdenInfiniteQueryOptionsOut<
		TQueryFnData,
		TData,
		TDef["error"],
		DefaultedInfinitePageParam<TPageParam>
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
		input?: DeepPartial<EdenQueryProcedureInput<TDef["input"]>>,
	) => DataTag<EdenQueryKey, TDef["output"], TDef["error"]>

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
		input?: DeepPartial<EdenQueryProcedureInput<TDef["input"]>>,
		filters?: QueryFilters<
			DataTag<EdenQueryKey, TDef["output"], TDef["error"]>
		>,
	) => WithRequired<
		QueryFilters<DataTag<EdenQueryKey, TDef["output"], TDef["error"]>>,
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
		input?: DeepPartial<EdenInfiniteQueryProcedureInput<TDef["input"]>>,
	) => DataTag<
		EdenQueryKey,
		InfiniteData<TDef["output"], DefaultInfinitePageParam<TDef>>,
		TDef["error"]
	>

	/**
	 * Create an infinite query filter.
	 */
	infiniteQueryFilter: (
		input?: DeepPartial<EdenInfiniteQueryProcedureInput<TDef["input"]>>,
		filters?: QueryFilters<
			DataTag<
				EdenQueryKey,
				InfiniteData<TDef["output"], DefaultInfinitePageParam<TDef>>,
				TDef["error"]
			>
		>,
	) => WithRequired<
		QueryFilters<
			DataTag<
				EdenQueryKey,
				InfiniteData<TDef["output"], DefaultInfinitePageParam<TDef>>,
				TDef["error"]
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

type ProcedureReservedPathSegment =
	| "~types"
	| "queryOptions"
	| "queryKey"
	| "queryFilter"
	| "infiniteQueryOptions"
	| "infiniteQueryKey"
	| "infiniteQueryFilter"
	| "mutationOptions"
	| "mutationKey"
	| "then"
	| "toJSON"
	| "$$typeof"
	| "constructor"
	| "__defineGetter__"
	| "__defineSetter__"
	| "hasOwnProperty"
	| "__lookupGetter__"
	| "__lookupSetter__"
	| "isPrototypeOf"
	| "propertyIsEnumerable"
	| "toString"
	| "valueOf"
	| "__proto__"
	| "toLocaleString"

type DecoratePathNode<
	TNode,
	TKey extends PropertyKey,
> = TNode extends RouteSchema
	? DecorateRoute<TNode, TKey & string> & DecorateProcedurePathSegments<TNode>
	: TNode extends Record<string, unknown>
		? DecorateRoutes<TNode>
		: never

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
	[K in Exclude<keyof TRoutes, keyof TRouteParams | "then">]: DecoratePathNode<
		TRoutes[K],
		K
	>
}

type DecorateProcedurePathSegments<
	TRoutes,
	TRouteParams = ExtractRouteParams<TRoutes>,
> = {
	[K in Exclude<
		keyof TRoutes,
		keyof RouteSchema | keyof TRouteParams | ProcedureReservedPathSegment
	>]: DecoratePathNode<TRoutes[K], K>
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
export type EdenOptionsProxy<TApp extends AnyElysia> = DecorateRoutes<
	ExtractRoutes<TApp>
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
export type inferInput<TProcedure extends { "~types": { input: unknown } }> =
	TProcedure["~types"]["input"]

/**
 * Infer output type from a decorated procedure.
 *
 * @example
 * type Output = inferOutput<typeof api.users.get>
 */
export type inferOutput<TProcedure extends { "~types": { output: unknown } }> =
	TProcedure["~types"]["output"]

/**
 * Infer error type from a decorated procedure.
 *
 * @example
 * type Error = inferError<typeof api.users.get>
 */
export type inferError<TProcedure extends { "~types": { error: unknown } }> =
	TProcedure["~types"]["error"]
