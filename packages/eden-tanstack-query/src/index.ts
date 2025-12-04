// @eden-tanstack-query/react
// TanStack Query integration for Elysia Eden

// Route type inference utilities
export type {
	EdenFetchError,
	ExtractPathParams,
	ExtractRoutes,
	GetRoute,
	HttpMethod,
	HttpMutationMethod,
	HttpQueryMethod,
	InferRouteBody,
	InferRouteError,
	InferRouteHeaders,
	InferRouteInput,
	InferRouteOptions,
	InferRouteOutput,
	InferRouteOutputAll,
	InferRouteParams,
	InferRouteQuery,
	IsMutationMethod,
	IsQueryMethod,
	PathParamsToObject,
	RouteDefinition,
} from "./types/infer"

// Utility types
export type {
	DeepPartial,
	IsAny,
	IsNever,
	IsUnknown,
	Simplify,
} from "./utils/types"

// TODO: Export main factory
// export { createEdenTanStackQuery } from './createEdenTanStackQuery'

// Decorator types for query/mutation procedures
export type {
	DecoratedRouteMethods,
	DecorateInfiniteQueryProcedure,
	DecorateMutationProcedure,
	DecorateQueryProcedure,
	DecorateRoute,
	DecorateRoutes,
	EdenInfiniteQueryOptions,
	EdenMutationKey,
	EdenMutationOptions,
	EdenOptionsProxy,
	EdenQueryBaseOptions,
	EdenQueryKey,
	EdenQueryOptions,
	EdenQueryOptionsResult,
	ExtractCursorType,
	ExtractRouteDef,
	HasCursorInput,
	inferError,
	inferInput,
	inferOutput,
	QueryType,
} from "./types/decorators"
