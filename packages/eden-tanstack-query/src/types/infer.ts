/**
 * Route type extraction utilities for Eden + TanStack Query integration.
 *
 * These types help extract input/output/error types from Elysia routes
 * via Eden Treaty's type inference.
 */
import type { AnyElysia, RouteSchema } from "elysia"

import type { IsAny, IsNever, IsUnknown, Simplify } from "../utils/types"

// ============================================================================
// Route Definition
// ============================================================================

/**
 * Base structure for route information.
 * Represents the extracted type information from an Elysia route.
 */
export interface RouteDefinition {
	/** Combined input: params + query + headers (for GET) or body (for mutations) */
	input: unknown
	/** Declared successful response types */
	output: unknown
	/** Declared non-success response and transport error types */
	error: unknown
}

// ============================================================================
// Route Input Extraction
// ============================================================================

/**
 * Extract params (path parameters) from a RouteSchema.
 *
 * @example
 * // Route: /users/:id
 * type Params = InferRouteParams<RouteSchema> // { id: string }
 */
export type InferRouteParams<TRoute extends RouteSchema> =
	IsNever<keyof TRoute["params"]> extends true
		? Record<never, never>
		: TRoute["params"]

/**
 * Extract query parameters from a RouteSchema.
 *
 * @example
 * // Route with ?search=foo&limit=10
 * type Query = InferRouteQuery<RouteSchema> // { search?: string; limit?: number }
 */
export type InferRouteQuery<TRoute extends RouteSchema> =
	IsNever<QueryKeys<TRoute["query"]>> extends true
		? Record<never, never>
		: TRoute["query"]

type QueryKeys<TQuery> =
	IsNever<TQuery> extends true
		? keyof TQuery
		: TQuery extends unknown
			? keyof TQuery
			: never

/**
 * Extract headers from a RouteSchema.
 */
export type InferRouteHeaders<TRoute extends RouteSchema> =
	undefined extends TRoute["headers"]
		? Record<string, string | undefined>
		: TRoute["headers"]

/**
 * Extract body from a RouteSchema.
 *
 * @example
 * // Route with body: t.Object({ name: t.String() })
 * type Body = InferRouteBody<RouteSchema> // { name: string }
 */
export type InferRouteBody<TRoute extends RouteSchema> =
	IsUnknown<TRoute["body"]> extends true ? undefined : TRoute["body"]

/**
 * Combined route options (params + query + headers).
 * Used for GET/HEAD/OPTIONS requests.
 */
export type InferRouteOptions<TRoute extends RouteSchema> = Simplify<
	(IsNever<keyof TRoute["params"]> extends true
		? { params?: Record<never, never> }
		: { params: TRoute["params"] }) &
		(IsNever<QueryKeys<TRoute["query"]>> extends true
			? { query?: Record<never, never> }
			: { query: TRoute["query"] }) &
		(undefined extends TRoute["headers"]
			? { headers?: Record<string, string> }
			: { headers: TRoute["headers"] })
>

type NormalizeRouteQuery<TQuery> =
	IsAny<TQuery> extends true ? TQuery : Simplify<TQuery>

/**
 * Combined input type for a route.
 *
 * For query routes (GET, HEAD, OPTIONS): only query params
 * (path params are passed via proxy callable, e.g., eden.users({ id: '1' }))
 * For mutation routes (POST, PUT, PATCH, DELETE): body
 *
 * @template TRoute - The RouteSchema to extract from
 * @template TMethod - HTTP method to determine input shape
 */
export type InferRouteInput<
	TRoute extends RouteSchema,
	TMethod extends string = "get",
> = TMethod extends "get" | "head" | "options"
	? NormalizeRouteQuery<InferRouteQuery<TRoute>>
	: InferRouteBody<TRoute>

// ============================================================================
// Route Output Extraction
// ============================================================================

/**
 * Helper type to replace Generator with AsyncGenerator in response types.
 * Elysia may return Generator for streaming responses.
 */
type ReplaceGeneratorWithAsyncGenerator<T extends Record<string, unknown>> = {
	[K in keyof T]: T[K] extends Generator<infer Y, infer R, infer N>
		? AsyncGenerator<Y, R, N>
		: T[K]
}

type NumericStatusCode<TStatus> = TStatus extends number
	? TStatus
	: TStatus extends `${infer TNumber extends number}`
		? TNumber
		: never

type NormalizeResponseStatusKeys<TResponse extends Record<number, unknown>> = {
	[K in keyof TResponse as NumericStatusCode<K>]: TResponse[K]
}

type ExtractSuccessResponses<TResponse extends Record<number, unknown>> = {
	[K in keyof NormalizeResponseStatusKeys<TResponse>]: K extends SuccessStatusCode
		? K extends BodylessSuccessStatusCode
			? ""
			: NormalizeResponseStatusKeys<TResponse>[K]
		: never
}[keyof NormalizeResponseStatusKeys<TResponse>]

/**
 * Extract the successful response type from a route.
 *
 * Unions every declared response in Eden Treaty's runtime-success range (200-299).
 * Bodyless 204 and 205 responses resolve to the empty string returned by Treaty.
 *
 * @example
 * type Output = InferRouteOutput<RouteSchema> // { id: string; name: string }
 */
export type InferRouteOutput<TRoute extends RouteSchema> =
	TRoute extends RouteSchema
		? TRoute["response"] extends Record<number, unknown>
			? ExtractSuccessResponses<
					ReplaceGeneratorWithAsyncGenerator<TRoute["response"]>
				>
			: never
		: never

/**
 * Extract all response types from a route (all status codes).
 */
export type InferRouteOutputAll<TRoute extends RouteSchema> =
	TRoute["response"] extends Record<number, unknown>
		? ReplaceGeneratorWithAsyncGenerator<TRoute["response"]>
		: never

// ============================================================================
// Route Error Extraction
// ============================================================================

type DecimalDigit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

/** Status codes treated as successful by Eden Treaty */
type SuccessStatusCode = NumericStatusCode<`2${DecimalDigit}${DecimalDigit}`>

type BodylessSuccessStatusCode = 204 | 205

/**
 * Eden-compatible fetch error class shape.
 *
 * Mirrors Eden's runtime `EdenFetchError`, which extends `Error` — so
 * `message`/`name`/`stack` exist. Note the runtime `message` is
 * `String(value)` (often "[object Object]" for JSON bodies); prefer
 * `status`/`value` for user-facing output.
 */
export interface EdenFetchError<
	TStatus extends number = number,
	TValue = unknown,
> extends Error {
	status: TStatus
	value: TValue
}

type TreatyTransportError = EdenFetchError<503, unknown>

/**
 * Helper type to extract error types from response record.
 * Maps each declared non-success status code to EdenFetchError.
 */
type ExtractErrorsFromResponse<TResponse extends Record<number, unknown>> = {
	[K in keyof NormalizeResponseStatusKeys<TResponse>]: K extends number
		? K extends SuccessStatusCode
			? never
			: EdenFetchError<K, NormalizeResponseStatusKeys<TResponse>[K]>
		: never
}[keyof NormalizeResponseStatusKeys<TResponse>]

type InferRouteErrorMember<TRoute extends RouteSchema> =
	TRoute["response"] extends Record<number, unknown>
		? ExtractErrorsFromResponse<TRoute["response"]> extends never
			? EdenFetchError<number, unknown>
			: ExtractErrorsFromResponse<TRoute["response"]>
		: EdenFetchError<number, unknown>

/**
 * Extract non-success response and transport error types from a route.
 *
 * @example
 * type Error = InferRouteError<RouteSchema>
 * // EdenFetchError<404, { message: string }> | EdenFetchError<500, { error: string }>
 *
 * If no error status codes are defined, returns EdenFetchError<number, unknown> as fallback.
 * All routes also include Treaty's 503 transport error with its unknown rejection value.
 */
export type InferRouteError<TRoute extends RouteSchema> =
	TRoute extends RouteSchema
		? InferRouteErrorMember<TRoute> | TreatyTransportError
		: never

// ============================================================================
// App Routes Extraction
// ============================================================================

/**
 * Extract the routes schema from an Elysia app.
 * Accesses the internal `~Routes` type that Eden Treaty uses.
 *
 * @example
 * const app = new Elysia().get('/users', () => [...])
 * type Routes = ExtractRoutes<typeof app>
 */
export type ExtractRoutes<TApp extends AnyElysia> = TApp extends {
	"~Routes": infer TRoutes extends Record<string, unknown>
}
	? TRoutes
	: never

type RouteAtPath<TRoutes, TPath extends string> = TPath extends ""
	? TRoutes
	: TPath extends `${infer Segment}/${infer Rest}`
		? Segment extends keyof TRoutes
			? RouteAtPath<TRoutes[Segment], Rest>
			: never
		: TPath extends keyof TRoutes
			? TRoutes[TPath]
			: never

/**
 * Get a specific route from the app by path and method.
 * Paths use schema segments such as `:id`, with an optional leading slash.
 *
 * @example
 * type UserRoute = GetRoute<typeof app, '/users/:id', 'get'>
 */
export type GetRoute<
	TApp extends AnyElysia,
	TPath extends string,
	TMethod extends string,
> =
	RouteAtPath<
		ExtractRoutes<TApp>,
		TPath extends `/${infer Path}` ? Path : TPath
	> extends infer Route
		? Route extends Record<string, unknown>
			? TMethod extends keyof Route
				? Route[TMethod]
				: never
			: never
		: never

// ============================================================================
// Path Parameter Extraction
// ============================================================================

/**
 * Extract path parameter names from a route path.
 *
 * @example
 * type Params = ExtractPathParams<'/users/:id/posts/:postId'>
 * // 'id' | 'postId'
 */
export type ExtractPathParams<TPath extends string> =
	TPath extends `${string}:${infer Param}/${infer Rest}`
		? Param | ExtractPathParams<`/${Rest}`>
		: TPath extends `${string}:${infer Param}`
			? Param
			: never

/**
 * Create params object type from path string.
 *
 * @example
 * type Params = PathParamsToObject<'/users/:id/posts/:postId'>
 * // { id: string; postId: string }
 */
export type PathParamsToObject<TPath extends string> = {
	[K in ExtractPathParams<TPath>]: string
}

// ============================================================================
// HTTP Method Types
// ============================================================================

/** HTTP methods that are typically used for queries (read operations) */
export type HttpQueryMethod = "get" | "options" | "head"

/** HTTP methods that are typically used for mutations (write operations) */
export type HttpMutationMethod = "post" | "put" | "patch" | "delete"

/** All HTTP methods */
export type HttpMethod = HttpQueryMethod | HttpMutationMethod

/**
 * Check if a method is a query method.
 */
export type IsQueryMethod<TMethod extends string> =
	TMethod extends HttpQueryMethod ? true : false

/**
 * Check if a method is a mutation method.
 */
export type IsMutationMethod<TMethod extends string> =
	TMethod extends HttpMutationMethod ? true : false
