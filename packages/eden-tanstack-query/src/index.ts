// eden-tanstack-react-query
// TanStack Query integration for Elysia Eden

// React context
export {
	type CreateEdenContextResult,
	createEdenContext,
	type EdenProviderProps,
} from "./context"
// Main factory
export {
	type CreateEdenTanStackQueryResult,
	createEdenTanStackQuery,
} from "./createEdenTanStackQuery"
export type { GetMutationKeyOptions, GetQueryKeyOptions } from "./keys/queryKey"
// Query key generation
export { getMutationKey, getQueryKey } from "./keys/queryKey"
// Query key types
export type {
	EdenMutationKey,
	EdenQueryKey,
	EdenQueryKeyMeta,
	EdenQueryKeyPathParam,
	QueryType,
} from "./keys/types"
export type {
	EdenInfiniteQueryOptionsArgs,
	EdenInfiniteQueryOptionsResult,
} from "./options/infiniteQueryOptions"
// Infinite query options factory
export { edenInfiniteQueryOptions } from "./options/infiniteQueryOptions"
export type {
	EdenMutationOptionsArgs,
	EdenMutationOptionsIn,
	EdenMutationOptionsOut,
	EdenMutationOptionsResult,
} from "./options/mutationOptions"
// Mutation options factory
export { edenMutationOptions } from "./options/mutationOptions"
// Query options factory
export { edenQueryOptions } from "./options/queryOptions"
// Options proxy
export {
	type CreateEdenOptionsProxyOptions,
	createEdenOptionsProxy,
} from "./proxy/createOptionsProxy"
// Decorator types for query/mutation procedures
export type {
	DecoratedRouteMethods,
	DecorateInfiniteQueryProcedure,
	DecorateMutationProcedure,
	DecorateQueryProcedure,
	DecorateRoute,
	DecorateRoutes,
	EdenInfiniteQueryOptions,
	EdenMutationOptions,
	EdenOptionsProxy,
	EdenQueryBaseOptions,
	EdenQueryOptions,
	EdenQueryOptionsResult,
	ExtractCursorType,
	ExtractRouteDef,
	HasCursorInput,
	inferError,
	inferInput,
	inferOutput,
} from "./types/decorators"
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
