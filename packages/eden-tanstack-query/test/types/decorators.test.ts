/**
 * Decorator type tests for Eden TanStack Query
 *
 * These tests verify that decorator types correctly add queryOptions,
 * mutationOptions, etc. to routes based on HTTP method.
 */
import type { DataTag } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import type {
	DecoratedRouteMethods,
	DecorateInfiniteQueryProcedure,
	DecorateMutationProcedure,
	DecorateQueryProcedure,
	DecorateRoute,
	EdenMutationKey,
	EdenOptionsProxy,
	EdenQueryKey,
	ExtractCursorType,
	ExtractRouteDef,
	HasCursorInput,
	inferError,
	inferInput,
	inferOutput,
} from "../../src/types/decorators"
import type { EdenFetchError, ExtractRoutes } from "../../src/types/infer"
import type { Equals } from "../../test-utils/type-assert"

// ============================================================================
// Test App Setup
// ============================================================================

const app = new Elysia()
	// GET route with path params
	.get("/users/:id", ({ params }) => ({
		id: params.id,
		name: "Test User",
		email: "test@example.com",
	}))
	// GET route with query params (for list/pagination)
	.get(
		"/users",
		({ query }) => ({
			items: [{ id: "1", name: "User", email: "user@example.com" }],
			nextCursor: query.cursor ? String(Number(query.cursor) + 10) : null,
		}),
		{
			query: t.Object({
				search: t.Optional(t.String()),
				limit: t.Optional(t.Number()),
				cursor: t.Optional(t.String()),
			}),
		},
	)
	// POST route with body
	.post(
		"/users",
		({ body }) => ({
			id: "new-id",
			name: body.name,
			email: body.email,
		}),
		{
			body: t.Object({
				name: t.String(),
				email: t.String(),
			}),
		},
	)
	// PUT route
	.put(
		"/users/:id",
		({ params, body }) => ({
			id: params.id,
			name: body.name,
			email: body.email,
		}),
		{
			body: t.Object({
				name: t.String(),
				email: t.String(),
			}),
		},
	)
	// DELETE route
	.delete("/users/:id", ({ params }) => ({
		deleted: true,
		id: params.id,
	}))

type App = typeof app
type Routes = ExtractRoutes<App>

const methodNamedApp = new Elysia()
	.get("/then", () => "reserved")
	.delete("/account", () => "deleted")
	.post("/account/delete", () => "posted")
	.post("/account/delete/:id", ({ params }) => params.id)
	.post("/account/delete/toString", () => "reserved")

type MethodNamedProxy = EdenOptionsProxy<typeof methodNamedApp>

// ============================================================================
// Query Key Types Tests
// ============================================================================

describe("Query Key Types", () => {
	test("EdenQueryKey has correct structure", () => {
		type Key = EdenQueryKey
		type IsArray = Key extends unknown[] ? true : false
		const isArray: IsArray = true
		expect(isArray).toBe(true)

		// First element should be path array
		type FirstElement = Key[0]
		type IsPathArray = FirstElement extends string[] ? true : false
		const isPathArray: IsPathArray = true
		expect(isPathArray).toBe(true)
	})

	test("EdenMutationKey has correct structure", () => {
		type Key = EdenMutationKey
		type IsArray = Key extends [string[]] ? true : false
		const isArray: IsArray = true
		expect(isArray).toBe(true)
	})
})

// ============================================================================
// DecorateQueryProcedure Tests
// ============================================================================

describe("DecorateQueryProcedure", () => {
	// Create a test definition
	type TestDef = {
		input: { id: string }
		output: { id: string; name: string }
		error: { message: string }
	}

	type Decorated = DecorateQueryProcedure<TestDef>

	test("has queryOptions method", () => {
		type HasQueryOptions = "queryOptions" extends keyof Decorated ? true : false
		const hasQueryOptions: HasQueryOptions = true
		expect(hasQueryOptions).toBe(true)
	})

	test("has queryKey method", () => {
		type HasQueryKey = "queryKey" extends keyof Decorated ? true : false
		const hasQueryKey: HasQueryKey = true
		expect(hasQueryKey).toBe(true)
	})

	test("has queryFilter method", () => {
		type HasQueryFilter = "queryFilter" extends keyof Decorated ? true : false
		const hasQueryFilter: HasQueryFilter = true
		expect(hasQueryFilter).toBe(true)
	})

	test("exposes ~types for inference", () => {
		type HasTypes = "~types" extends keyof Decorated ? true : false
		const hasTypes: HasTypes = true
		expect(hasTypes).toBe(true)

		type Types = Decorated["~types"]
		type InputMatches = Types["input"] extends { id: string } ? true : false
		type OutputMatches = Types["output"] extends { id: string; name: string }
			? true
			: false

		const inputMatches: InputMatches = true
		const outputMatches: OutputMatches = true

		expect(inputMatches).toBe(true)
		expect(outputMatches).toBe(true)
	})
})

// ============================================================================
// DecorateMutationProcedure Tests
// ============================================================================

describe("DecorateMutationProcedure", () => {
	type TestDef = {
		input: { name: string; email: string }
		output: { id: string; name: string; email: string }
		error: { message: string }
	}

	type Decorated = DecorateMutationProcedure<TestDef>

	test("has mutationOptions method", () => {
		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})

	test("has mutationKey method", () => {
		type HasMutationKey = "mutationKey" extends keyof Decorated ? true : false
		const hasMutationKey: HasMutationKey = true
		expect(hasMutationKey).toBe(true)
	})

	test("does NOT have queryOptions", () => {
		type HasQueryOptions = "queryOptions" extends keyof Decorated ? true : false
		const hasQueryOptions: HasQueryOptions = false
		expect(hasQueryOptions).toBe(false)
	})

	test("exposes ~types for inference", () => {
		type Types = Decorated["~types"]
		type InputMatches = Types["input"] extends { name: string; email: string }
			? true
			: false
		type OutputMatches = Types["output"] extends {
			id: string
			name: string
			email: string
		}
			? true
			: false

		const inputMatches: InputMatches = true
		const outputMatches: OutputMatches = true

		expect(inputMatches).toBe(true)
		expect(outputMatches).toBe(true)
	})
})

// ============================================================================
// DecorateInfiniteQueryProcedure Tests
// ============================================================================

describe("DecorateInfiniteQueryProcedure", () => {
	type TestDef = {
		input: { limit: number; cursor?: string }
		output: { items: { id: string }[]; nextCursor: string | null }
		error: { message: string }
	}

	type Decorated = DecorateInfiniteQueryProcedure<TestDef>

	test("has infiniteQueryOptions method", () => {
		type HasInfiniteQueryOptions =
			"infiniteQueryOptions" extends keyof Decorated ? true : false
		const hasInfiniteQueryOptions: HasInfiniteQueryOptions = true
		expect(hasInfiniteQueryOptions).toBe(true)
	})

	test("has infiniteQueryKey method", () => {
		type HasInfiniteQueryKey = "infiniteQueryKey" extends keyof Decorated
			? true
			: false
		const hasInfiniteQueryKey: HasInfiniteQueryKey = true
		expect(hasInfiniteQueryKey).toBe(true)
	})

	test("has infiniteQueryFilter method", () => {
		type HasInfiniteQueryFilter = "infiniteQueryFilter" extends keyof Decorated
			? true
			: false
		const hasInfiniteQueryFilter: HasInfiniteQueryFilter = true
		expect(hasInfiniteQueryFilter).toBe(true)
	})
})

// ============================================================================
// Cursor Type Extraction Tests
// ============================================================================

describe("Cursor Type Extraction", () => {
	test("ExtractCursorType extracts cursor from input", () => {
		type Input = { limit: number; cursor?: string }
		type Cursor = ExtractCursorType<Input>
		type IsString = Cursor extends string | undefined ? true : false
		const isString: IsString = true
		expect(isString).toBe(true)
	})

	test("HasCursorInput detects cursor input", () => {
		type WithCursor = { cursor?: string }
		type WithoutCursor = { id: string }

		type HasCursor = HasCursorInput<WithCursor>
		type NoCursor = HasCursorInput<WithoutCursor>

		const hasCursor: HasCursor = true
		const noCursor: NoCursor = false

		expect(hasCursor).toBe(true)
		expect(noCursor).toBe(false)
	})
})

// ============================================================================
// DecorateRoute Tests (HTTP method-based decoration)
// ============================================================================

describe("DecorateRoute", () => {
	// Elysia ~Routes structure: { users: { ":id": { get: ... }, get: ..., post: ... } }
	type UserIdRoute = Routes["users"][":id"]["get"]
	type CreateUserRoute = Routes["users"]["post"]

	test("GET route decorated as query procedure", () => {
		type Decorated = DecorateRoute<UserIdRoute, "get">

		type HasQueryOptions = "queryOptions" extends keyof Decorated ? true : false
		type HasQueryKey = "queryKey" extends keyof Decorated ? true : false
		type HasQueryFilter = "queryFilter" extends keyof Decorated ? true : false

		const hasQueryOptions: HasQueryOptions = true
		const hasQueryKey: HasQueryKey = true
		const hasQueryFilter: HasQueryFilter = true

		expect(hasQueryOptions).toBe(true)
		expect(hasQueryKey).toBe(true)
		expect(hasQueryFilter).toBe(true)
	})

	test("POST route decorated as mutation procedure", () => {
		type Decorated = DecorateRoute<CreateUserRoute, "post">

		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		type HasMutationKey = "mutationKey" extends keyof Decorated ? true : false

		const hasMutationOptions: HasMutationOptions = true
		const hasMutationKey: HasMutationKey = true

		expect(hasMutationOptions).toBe(true)
		expect(hasMutationKey).toBe(true)
	})

	test("PUT route decorated as mutation procedure", () => {
		type PutRoute = Routes["users"][":id"]["put"]
		type Decorated = DecorateRoute<PutRoute, "put">

		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})

	test("DELETE route decorated as mutation procedure", () => {
		type DeleteRoute = Routes["users"][":id"]["delete"]
		type Decorated = DecorateRoute<DeleteRoute, "delete">

		type HasMutationOptions = "mutationOptions" extends keyof Decorated
			? true
			: false
		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})
})

// ============================================================================
// DecoratedRouteMethods Tests
// ============================================================================

describe("DecoratedRouteMethods", () => {
	test("decorates all methods of a route", () => {
		// Elysia ~Routes structure: { users: { ":id": { get: ..., put: ..., delete: ... } } }
		type UserIdMethods = Routes["users"][":id"]
		type Decorated = DecoratedRouteMethods<UserIdMethods>

		// GET should have queryOptions
		type GetHasQueryOptions = "queryOptions" extends keyof Decorated["get"]
			? true
			: false
		const getHasQueryOptions: GetHasQueryOptions = true
		expect(getHasQueryOptions).toBe(true)

		// PUT should have mutationOptions
		type PutHasMutationOptions =
			"mutationOptions" extends keyof Decorated["put"] ? true : false
		const putHasMutationOptions: PutHasMutationOptions = true
		expect(putHasMutationOptions).toBe(true)

		// DELETE should have mutationOptions
		type DeleteHasMutationOptions =
			"mutationOptions" extends keyof Decorated["delete"] ? true : false
		const deleteHasMutationOptions: DeleteHasMutationOptions = true
		expect(deleteHasMutationOptions).toBe(true)
	})
})

// ============================================================================
// ExtractRouteDef Tests
// ============================================================================

describe("ExtractRouteDef", () => {
	test("extracts definition from GET route", () => {
		type UserIdRoute = Routes["users"][":id"]["get"]
		type Def = ExtractRouteDef<UserIdRoute, "get">

		// For GET routes, input is only query params (path params passed via proxy callable)
		// UserIdRoute has no query params, so input should be empty
		// biome-ignore lint/complexity/noBannedTypes: {} check is intentional for empty object test
		type InputIsEmpty = {} extends Def["input"] ? true : false
		const inputIsEmpty: InputIsEmpty = true
		expect(inputIsEmpty).toBe(true)

		// Output should have id, name, email
		type OutputHasId = Def["output"] extends { id: string } ? true : false
		type OutputHasName = Def["output"] extends { name: string } ? true : false
		type OutputHasEmail = Def["output"] extends { email: string } ? true : false

		const outputHasId: OutputHasId = true
		const outputHasName: OutputHasName = true
		const outputHasEmail: OutputHasEmail = true

		expect(outputHasId).toBe(true)
		expect(outputHasName).toBe(true)
		expect(outputHasEmail).toBe(true)
	})

	test("extracts definition from POST route", () => {
		type CreateUserRoute = Routes["users"]["post"]
		type Def = ExtractRouteDef<CreateUserRoute, "post">

		// Input should be body (name, email)
		type InputHasName = Def["input"] extends { name: string } ? true : false
		type InputHasEmail = Def["input"] extends { email: string } ? true : false

		const inputHasName: InputHasName = true
		const inputHasEmail: InputHasEmail = true

		expect(inputHasName).toBe(true)
		expect(inputHasEmail).toBe(true)
	})
})

// ============================================================================
// EdenOptionsProxy Tests
// ============================================================================

describe("EdenOptionsProxy", () => {
	type Proxy = EdenOptionsProxy<App>

	test("has route segments as keys", () => {
		// EdenOptionsProxy uses nested object structure, not full paths
		// e.g., proxy.users instead of proxy["/users"]
		type HasUsers = "users" extends keyof Proxy ? true : false

		const hasUsers: HasUsers = true

		expect(hasUsers).toBe(true)
	})

	test("route segments have HTTP methods or nested routes", () => {
		type UsersRoute = Proxy["users"]
		type HasGet = "get" extends keyof UsersRoute ? true : false
		type HasPost = "post" extends keyof UsersRoute ? true : false

		const hasGet: HasGet = true
		const hasPost: HasPost = true

		expect(hasGet).toBe(true)
		expect(hasPost).toBe(true)
	})

	test("GET method has queryOptions", () => {
		type UsersGet = Proxy["users"]["get"]
		type HasQueryOptions = "queryOptions" extends keyof UsersGet ? true : false

		const hasQueryOptions: HasQueryOptions = true
		expect(hasQueryOptions).toBe(true)
	})

	test("POST method has mutationOptions", () => {
		type UsersPost = Proxy["users"]["post"]
		type HasMutationOptions = "mutationOptions" extends keyof UsersPost
			? true
			: false

		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})

	test("path params routes are callable", () => {
		// For routes with path params, the proxy is callable
		// e.g., proxy.users({ id: '1' }).get.queryOptions()
		type UsersCallable = Proxy["users"] extends (params: {
			id: string | number
		}) => unknown
			? true
			: false
		const usersCallable: UsersCallable = true
		expect(usersCallable).toBe(true)
	})
})

// ============================================================================
// Type Inference via ~types Tests
// ============================================================================

describe("Type Inference via ~types", () => {
	type TestDef = {
		input: { id: string }
		output: { name: string }
		error: { message: string }
	}

	type QueryProc = DecorateQueryProcedure<TestDef>
	type MutationProc = DecorateMutationProcedure<TestDef>

	test("~types.input extracts input type from query procedure", () => {
		type Input = QueryProc["~types"]["input"]
		type IsCorrect = Input extends { id: string } ? true : false
		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("~types.output extracts output type from query procedure", () => {
		type Output = QueryProc["~types"]["output"]
		type IsCorrect = Output extends { name: string } ? true : false
		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("~types.error extracts error type from query procedure", () => {
		type Error = QueryProc["~types"]["error"]
		type IsCorrect = Error extends { message: string } ? true : false
		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("~types works with mutation procedures too", () => {
		type Input = MutationProc["~types"]["input"]
		type Output = MutationProc["~types"]["output"]

		type InputCorrect = Input extends { id: string } ? true : false
		type OutputCorrect = Output extends { name: string } ? true : false

		const inputCorrect: InputCorrect = true
		const outputCorrect: OutputCorrect = true

		expect(inputCorrect).toBe(true)
		expect(outputCorrect).toBe(true)
	})
})

// ============================================================================
// EdenMutationFunction Tests
// ============================================================================

describe("EdenMutationFunction", () => {
	test("accepts required input", () => {
		type MutFn = import("../../src/types/decorators").EdenMutationFunction<
			{ result: string },
			{ name: string }
		>

		// Should require input
		type InputRequired = Parameters<MutFn>[0] extends { name: string }
			? true
			: false
		const inputRequired: InputRequired = true
		expect(inputRequired).toBe(true)
	})

	test("allows optional input when empty", () => {
		type MutFn = import("../../src/types/decorators").EdenMutationFunction<
			{ result: string },
			// biome-ignore lint/complexity/noBannedTypes: Testing empty input
			{}
		>

		// Should allow void (no args) due to EmptyToVoid
		type AllowsVoid = void extends Parameters<MutFn>[0] ? true : false
		const allowsVoid: AllowsVoid = true
		expect(allowsVoid).toBe(true)
	})

	test("returns Promise of output", () => {
		type MutFn = import("../../src/types/decorators").EdenMutationFunction<
			{ id: string; name: string },
			{ name: string }
		>

		type Returns = ReturnType<MutFn>
		type IsPromise =
			Returns extends Promise<{ id: string; name: string }> ? true : false
		const isPromise: IsPromise = true
		expect(isPromise).toBe(true)
	})
})

// ============================================================================
// RouteParamsInput Tests
// ============================================================================

describe("RouteParamsInput", () => {
	test("extracts param names from path param keys", () => {
		type Input = import("../../src/types/decorators").RouteParamsInput<{
			":id": unknown
			":slug": unknown
		}>

		type HasId = "id" extends keyof Input ? true : false
		type HasSlug = "slug" extends keyof Input ? true : false

		const hasId: HasId = true
		const hasSlug: HasSlug = true

		expect(hasId).toBe(true)
		expect(hasSlug).toBe(true)
	})

	test("param values are string | number", () => {
		type Input = import("../../src/types/decorators").RouteParamsInput<{
			":id": unknown
		}>

		type IdType = Input["id"]
		type IsStringOrNumber = IdType extends string | number ? true : false
		const isStringOrNumber: IsStringOrNumber = true
		expect(isStringOrNumber).toBe(true)
	})

	test("ignores non-param keys", () => {
		type Input = import("../../src/types/decorators").RouteParamsInput<{
			":id": unknown
			get: unknown
			post: unknown
		}>

		// Only :id should be extracted (without colon)
		type HasId = "id" extends keyof Input ? true : false
		type HasGet = "get" extends keyof Input ? true : false
		type HasPost = "post" extends keyof Input ? true : false

		const hasId: HasId = true
		const hasGet: HasGet = false
		const hasPost: HasPost = false

		expect(hasId).toBe(true)
		expect(hasGet).toBe(false)
		expect(hasPost).toBe(false)
	})
})

// ============================================================================
// inferInput / inferOutput / inferError Tests
// ============================================================================

describe("inferInput / inferOutput / inferError", () => {
	test("propagate types from a concrete proxy procedure", () => {
		type Procedure = EdenOptionsProxy<App>["users"]["get"]
		type Definition = ExtractRouteDef<Routes["users"]["get"], "get">

		const input: Equals<inferInput<Procedure>, Definition["input"]> = true
		const output: Equals<inferOutput<Procedure>, Definition["output"]> = true
		const error: Equals<inferError<Procedure>, Definition["error"]> = true

		expect(input).toBe(true)
		expect(output).toBe(true)
		expect(error).toBe(true)
	})
})

// ============================================================================
// EdenQueryBaseOptions Tests
// ============================================================================

describe("EdenQueryBaseOptions", () => {
	test("eden property is optional", () => {
		type Opts = import("../../src/types/decorators").EdenQueryBaseOptions

		// eden should be optional
		type EdenIsOptional = undefined extends Opts["eden"] ? true : false
		const edenIsOptional: EdenIsOptional = true
		expect(edenIsOptional).toBe(true)
	})
})

// ============================================================================
// EdenQueryOptionsResult Tests
// ============================================================================

describe("EdenQueryOptionsResult", () => {
	test("has eden.path property", () => {
		type Result = import("../../src/types/decorators").EdenQueryOptionsResult

		type HasEden = "eden" extends keyof Result ? true : false
		type HasPath = Result["eden"] extends { path: string } ? true : false

		const hasEden: HasEden = true
		const hasPath: HasPath = true

		expect(hasEden).toBe(true)
		expect(hasPath).toBe(true)
	})
})

// ============================================================================
// EdenQueryOptions Callable Interface Tests
// ============================================================================

describe("EdenQueryOptions callable interface", () => {
	type TestDef = {
		input: { search?: string }
		output: { id: string; name: string }
		error: { message: string }
	}

	type EmptyInputDef = {
		input: Record<never, never>
		output: { message: string }
		error: { code: number }
	}

	// For callable interface testing, we test via DecorateQueryProcedure
	// which is what actual usage looks like
	type TestQueryProcedure = DecorateQueryProcedure<TestDef>
	type EmptyInputQueryProcedure = DecorateQueryProcedure<EmptyInputDef>

	test("DecorateQueryProcedure.queryOptions exists", () => {
		// Verify the queryOptions property exists
		type HasQueryOptions = "queryOptions" extends keyof TestQueryProcedure
			? true
			: false

		const hasQueryOptions: HasQueryOptions = true
		expect(hasQueryOptions).toBe(true)
	})

	test("queryOptions returns object with queryKey and eden via proxy", () => {
		// Test via the proxy type which is the real usage
		type UsersGetProcedure = EdenOptionsProxy<App>["users"]["get"]
		type QueryOptionsMethod = UsersGetProcedure["queryOptions"]

		// For callable types, ReturnType picks the last overload
		type LastOverloadReturn = ReturnType<QueryOptionsMethod>

		// Check that return type has expected properties
		type HasQueryKey = "queryKey" extends keyof LastOverloadReturn
			? true
			: false
		type HasEden = "eden" extends keyof LastOverloadReturn ? true : false

		const hasQueryKey: HasQueryKey = true
		const hasEden: HasEden = true

		expect(hasQueryKey).toBe(true)
		expect(hasEden).toBe(true)
	})

	test("empty input procedure allows void via EmptyToVoid", () => {
		// For empty input, the type should allow calling with void
		type QueryOptionsMethod = EmptyInputQueryProcedure["queryOptions"]

		// Parameters should allow void/undefined for first argument
		type FirstParam = Parameters<QueryOptionsMethod>[0]
		type AllowsVoid = void extends FirstParam ? true : false

		const allowsVoid: AllowsVoid = true
		expect(allowsVoid).toBe(true)
	})

	test("~types correctly exposes output type", () => {
		// The ~types helper should expose the correct output
		type OutputType = TestQueryProcedure["~types"]["output"]
		type IsCorrect = OutputType extends { id: string; name: string }
			? true
			: false

		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})
})

// ============================================================================
// EdenOptionsProxy Full Path Type Tests
// ============================================================================

describe("EdenOptionsProxy queryOptions return types", () => {
	type Proxy = EdenOptionsProxy<App>

	test("proxy.users.get.queryOptions() returns object, not function", () => {
		// This test ensures the full proxy chain works correctly
		type UsersGet = Proxy["users"]["get"]
		type QueryOptionsMethod = UsersGet["queryOptions"]
		type CallResult = ReturnType<QueryOptionsMethod>

		// Critical: CallResult should be an object with queryKey, queryFn, eden
		// NOT a function type like () => never
		type IsObject = CallResult extends { queryKey: unknown; eden: unknown }
			? true
			: false
		type IsNotFunction = CallResult extends (...args: unknown[]) => unknown
			? false
			: true

		const isObject: IsObject = true
		const isNotFunction: IsNotFunction = true

		expect(isObject).toBe(true)
		expect(isNotFunction).toBe(true)
	})

	test("proxy.users.post.mutationOptions() returns correct type", () => {
		type UsersPost = Proxy["users"]["post"]
		type MutationOptionsMethod = UsersPost["mutationOptions"]
		type CallResult = ReturnType<MutationOptionsMethod>

		type HasMutationKey = CallResult extends { mutationKey: unknown }
			? true
			: false
		type HasMutationFn = CallResult extends { mutationFn: unknown }
			? true
			: false

		const hasMutationKey: HasMutationKey = true
		const hasMutationFn: HasMutationFn = true

		expect(hasMutationKey).toBe(true)
		expect(hasMutationFn).toBe(true)
	})

	test("queryOptions input allows top-level headers", () => {
		type UsersGet = Proxy["users"]["get"]
		type QueryInput = Parameters<UsersGet["queryOptions"]>[0]

		type AcceptsHeaders = {
			search?: string
			headers?: Record<string, string | undefined>
		} extends QueryInput
			? true
			: false

		const acceptsHeaders: AcceptsHeaders = true
		expect(acceptsHeaders).toBe(true)
	})

	test("queryOptions input allows request-shape query + headers", () => {
		type UsersGet = Proxy["users"]["get"]
		type QueryInput = Parameters<UsersGet["queryOptions"]>[0]

		type AcceptsRequestShape = {
			query?: { search?: string }
			headers: Record<string, string | undefined> | undefined
		} extends QueryInput
			? true
			: false

		const acceptsRequestShape: AcceptsRequestShape = true
		expect(acceptsRequestShape).toBe(true)
	})
})

describe("EdenOptionsProxy method-named path segments", () => {
	test("preserves a static route after a method-named segment", () => {
		type NestedPost = MethodNamedProxy["account"]["delete"]["post"]
		type HasMutationOptions = "mutationOptions" extends keyof NestedPost
			? true
			: false
		const hasMutationOptions: HasMutationOptions = true

		expect(hasMutationOptions).toBe(true)
	})

	test("does not promise callable params on a procedure object", () => {
		type DeleteProcedure = MethodNamedProxy["account"]["delete"]
		type IsCallable = DeleteProcedure extends (...args: never[]) => unknown
			? true
			: false
		const isCallable: IsCallable = false

		expect(isCallable).toBe(false)
	})

	test("does not expose reserved object members as nested routes", () => {
		type DeleteProcedure = MethodNamedProxy["account"]["delete"]
		type ToStringIsNestedRoute = DeleteProcedure["toString"] extends {
			post: unknown
		}
			? true
			: false
		const toStringIsNestedRoute: ToStringIsNestedRoute = false

		expect(toStringIsNestedRoute).toBe(false)
	})

	test("does not promise a then route on the non-thenable proxy", () => {
		type HasThenRoute = "then" extends keyof MethodNamedProxy ? true : false
		const hasThenRoute: HasThenRoute = false

		expect(hasThenRoute).toBe(false)
	})
})

// ============================================================================
// EdenMutationOptions Callable Interface Tests
// ============================================================================

describe("EdenMutationOptions callable interface", () => {
	type TestDef = {
		input: { name: string; email: string }
		output: { id: string; name: string; email: string }
		error: { message: string }
	}

	type TestMutationProcedure = DecorateMutationProcedure<TestDef>

	test("DecorateMutationProcedure.mutationOptions exists", () => {
		type HasMutationOptions =
			"mutationOptions" extends keyof TestMutationProcedure ? true : false

		const hasMutationOptions: HasMutationOptions = true
		expect(hasMutationOptions).toBe(true)
	})

	test("mutationOptions returns object with mutationKey, mutationFn, eden", () => {
		type MutationOptionsMethod = TestMutationProcedure["mutationOptions"]
		type CallResult = ReturnType<MutationOptionsMethod>

		type HasMutationKey = "mutationKey" extends keyof CallResult ? true : false
		type HasMutationFn = "mutationFn" extends keyof CallResult ? true : false
		type HasEden = "eden" extends keyof CallResult ? true : false

		const hasMutationKey: HasMutationKey = true
		const hasMutationFn: HasMutationFn = true
		const hasEden: HasEden = true

		expect(hasMutationKey).toBe(true)
		expect(hasMutationFn).toBe(true)
		expect(hasEden).toBe(true)
	})

	test("mutationFn exists in return type", () => {
		type MutationOptionsMethod = TestMutationProcedure["mutationOptions"]
		type CallResult = ReturnType<MutationOptionsMethod>

		// mutationFn should exist in the return type
		type HasMutationFn = "mutationFn" extends keyof CallResult ? true : false

		const hasMutationFn: HasMutationFn = true
		expect(hasMutationFn).toBe(true)
	})

	test("~types correctly exposes input and output", () => {
		type InputType = TestMutationProcedure["~types"]["input"]
		type OutputType = TestMutationProcedure["~types"]["output"]

		type InputCorrect = InputType extends { name: string; email: string }
			? true
			: false
		type OutputCorrect = OutputType extends {
			id: string
			name: string
			email: string
		}
			? true
			: false

		const inputCorrect: InputCorrect = true
		const outputCorrect: OutputCorrect = true

		expect(inputCorrect).toBe(true)
		expect(outputCorrect).toBe(true)
	})
})

// ============================================================================
// EdenInfiniteQueryOptions Callable Interface Tests
// ============================================================================

describe("EdenInfiniteQueryOptions callable interface", () => {
	type TestDef = {
		input: { limit: number; cursor?: string }
		output: { items: { id: string }[]; nextCursor: string | null }
		error: { message: string }
	}

	type TestInfiniteQueryProcedure = DecorateInfiniteQueryProcedure<TestDef>

	test("DecorateInfiniteQueryProcedure.infiniteQueryOptions exists", () => {
		type HasInfiniteQueryOptions =
			"infiniteQueryOptions" extends keyof TestInfiniteQueryProcedure
				? true
				: false

		const hasInfiniteQueryOptions: HasInfiniteQueryOptions = true
		expect(hasInfiniteQueryOptions).toBe(true)
	})

	test("infiniteQueryKey exists", () => {
		type HasInfiniteQueryKey =
			"infiniteQueryKey" extends keyof TestInfiniteQueryProcedure ? true : false

		const hasInfiniteQueryKey: HasInfiniteQueryKey = true
		expect(hasInfiniteQueryKey).toBe(true)
	})

	test("infiniteQueryFilter exists", () => {
		type HasInfiniteQueryFilter =
			"infiniteQueryFilter" extends keyof TestInfiniteQueryProcedure
				? true
				: false

		const hasInfiniteQueryFilter: HasInfiniteQueryFilter = true
		expect(hasInfiniteQueryFilter).toBe(true)
	})

	test("~types correctly exposes input and output", () => {
		type InputType = TestInfiniteQueryProcedure["~types"]["input"]
		type OutputType = TestInfiniteQueryProcedure["~types"]["output"]

		type InputHasLimit = InputType extends { limit: number } ? true : false
		type OutputHasItems = OutputType extends { items: unknown[] } ? true : false

		const inputHasLimit: InputHasLimit = true
		const outputHasItems: OutputHasItems = true

		expect(inputHasLimit).toBe(true)
		expect(outputHasItems).toBe(true)
	})

	test("infiniteQueryOptions return type has initialPageParam", () => {
		type InfiniteQueryOptionsMethod =
			TestInfiniteQueryProcedure["infiniteQueryOptions"]
		type CallResult = ReturnType<InfiniteQueryOptionsMethod>

		type HasInitialPageParam = "initialPageParam" extends keyof CallResult
			? true
			: false

		const hasInitialPageParam: HasInitialPageParam = true
		expect(hasInitialPageParam).toBe(true)
	})

	test("infiniteQueryOptions return type has getNextPageParam", () => {
		type InfiniteQueryOptionsMethod =
			TestInfiniteQueryProcedure["infiniteQueryOptions"]
		type CallResult = ReturnType<InfiniteQueryOptionsMethod>

		type HasGetNextPageParam = "getNextPageParam" extends keyof CallResult
			? true
			: false

		const hasGetNextPageParam: HasGetNextPageParam = true
		expect(hasGetNextPageParam).toBe(true)
	})

	test("infiniteQueryOptions return type has queryKey and eden", () => {
		type InfiniteQueryOptionsMethod =
			TestInfiniteQueryProcedure["infiniteQueryOptions"]
		type CallResult = ReturnType<InfiniteQueryOptionsMethod>

		type HasQueryKey = "queryKey" extends keyof CallResult ? true : false
		type HasEden = "eden" extends keyof CallResult ? true : false

		const hasQueryKey: HasQueryKey = true
		const hasEden: HasEden = true

		expect(hasQueryKey).toBe(true)
		expect(hasEden).toBe(true)
	})

	test("infiniteQueryOptions return type is not a function", () => {
		type InfiniteQueryOptionsMethod =
			TestInfiniteQueryProcedure["infiniteQueryOptions"]
		type CallResult = ReturnType<InfiniteQueryOptionsMethod>

		type IsNotFunction = CallResult extends (...args: unknown[]) => unknown
			? false
			: true

		const isNotFunction: IsNotFunction = true
		expect(isNotFunction).toBe(true)
	})
})

// ============================================================================
// EdenInfiniteQueryOptions InfiniteData Type Tests
// ============================================================================

describe("EdenInfiniteQueryOptions InfiniteData types", () => {
	type TestDef = {
		input: { limit: number; cursor?: string }
		output: { items: { id: string }[]; nextCursor: string | null }
		error: { message: string }
	}

	type TestInfiniteQueryProcedure = DecorateInfiniteQueryProcedure<TestDef>
	type InfiniteQueryOptionsMethod =
		TestInfiniteQueryProcedure["infiniteQueryOptions"]
	type CallResult = ReturnType<InfiniteQueryOptionsMethod>

	test("queryKey is tagged with DataTag type", () => {
		type QueryKeyType = CallResult["queryKey"]

		// queryKey should be a DataTag
		type HasDataTag =
			QueryKeyType extends DataTag<EdenQueryKey, unknown, unknown>
				? true
				: false

		const hasDataTag: HasDataTag = true
		expect(hasDataTag).toBe(true)
	})

	test("return type has required infinite query properties", () => {
		// The return type should have all properties needed for useInfiniteQuery
		type HasQueryKey = "queryKey" extends keyof CallResult ? true : false
		type HasQueryFn = "queryFn" extends keyof CallResult ? true : false
		type HasInitialPageParam = "initialPageParam" extends keyof CallResult
			? true
			: false
		type HasGetNextPageParam = "getNextPageParam" extends keyof CallResult
			? true
			: false

		const hasQueryKey: HasQueryKey = true
		const hasQueryFn: HasQueryFn = true
		const hasInitialPageParam: HasInitialPageParam = true
		const hasGetNextPageParam: HasGetNextPageParam = true

		expect(hasQueryKey).toBe(true)
		expect(hasQueryFn).toBe(true)
		expect(hasInitialPageParam).toBe(true)
		expect(hasGetNextPageParam).toBe(true)
	})
})

// ============================================================================
// Error Type Tests for Decorated Procedures
// ============================================================================

describe("Error type in decorated procedures", () => {
	describe("DecorateQueryProcedure error type", () => {
		type TestDef = {
			input: { id: string }
			output: { id: string; name: string }
			error: { message: string; code: string }
		}

		type Decorated = DecorateQueryProcedure<TestDef>

		test("~types.error exposes error type", () => {
			type ErrorType = Decorated["~types"]["error"]
			type HasMessage = ErrorType extends { message: string } ? true : false
			type HasCode = ErrorType extends { code: string } ? true : false

			const hasMessage: HasMessage = true
			const hasCode: HasCode = true

			expect(hasMessage).toBe(true)
			expect(hasCode).toBe(true)
		})
	})

	describe("DecorateMutationProcedure error type", () => {
		type TestDef = {
			input: { name: string }
			output: { id: string }
			error: { message: string; errors: string[] }
		}

		type Decorated = DecorateMutationProcedure<TestDef>

		test("~types.error exposes error type", () => {
			type ErrorType = Decorated["~types"]["error"]
			type HasMessage = ErrorType extends { message: string } ? true : false
			type HasErrors = ErrorType extends { errors: string[] } ? true : false

			const hasMessage: HasMessage = true
			const hasErrors: HasErrors = true

			expect(hasMessage).toBe(true)
			expect(hasErrors).toBe(true)
		})
	})

	describe("DecorateInfiniteQueryProcedure error type", () => {
		type TestDef = {
			input: { limit: number; cursor?: string }
			output: { items: { id: string }[]; nextCursor: string | null }
			error: { message: string; statusCode: number }
		}

		type Decorated = DecorateInfiniteQueryProcedure<TestDef>

		test("~types.error exposes error type", () => {
			type ErrorType = Decorated["~types"]["error"]
			type HasMessage = ErrorType extends { message: string } ? true : false
			type HasStatusCode = ErrorType extends { statusCode: number }
				? true
				: false

			const hasMessage: HasMessage = true
			const hasStatusCode: HasStatusCode = true

			expect(hasMessage).toBe(true)
			expect(hasStatusCode).toBe(true)
		})
	})

	describe("emitted TError (not just ~types)", () => {
		// Mirrors ExtractRouteDef: TDef["error"] is already an EdenFetchError
		// union produced by InferRouteError — the decorators must NOT wrap it
		// a second time.
		type RouteError =
			| EdenFetchError<404, { message: string }>
			| EdenFetchError<500, { error: string }>
		type TestDef = {
			input: { id: string }
			output: { name: string }
			error: RouteError
		}

		type ErrorOfTag<K> =
			K extends DataTag<infer _T, infer _V, infer E> ? E : never

		test("queryOptions emits the route error unwrapped", () => {
			type Opts = ReturnType<DecorateQueryProcedure<TestDef>["queryOptions"]>
			type Emitted = ErrorOfTag<Opts["queryKey"]>

			const exact: Equals<Emitted, RouteError> = true
			expect(exact).toBe(true)
		})

		test("queryKey tag carries the route error unwrapped", () => {
			type KeyTag = ReturnType<DecorateQueryProcedure<TestDef>["queryKey"]>
			type Emitted = ErrorOfTag<KeyTag>

			const exact: Equals<Emitted, RouteError> = true
			expect(exact).toBe(true)
		})

		test("mutationOptions emits the route error unwrapped", () => {
			type Opts = ReturnType<
				DecorateMutationProcedure<TestDef>["mutationOptions"]
			>
			type Emitted = Parameters<NonNullable<Opts["onError"]>>[0]

			const exact: Equals<Emitted, RouteError> = true
			expect(exact).toBe(true)
		})

		test("infiniteQueryOptions emits the route error unwrapped", () => {
			type InfDef = {
				input: { cursor?: string; limit: number }
				output: { items: string[]; nextCursor: string | null }
				error: RouteError
			}
			type Opts = ReturnType<
				DecorateInfiniteQueryProcedure<InfDef>["infiniteQueryOptions"]
			>
			type Emitted = ErrorOfTag<Opts["queryKey"]>

			const exact: Equals<Emitted, RouteError> = true
			expect(exact).toBe(true)
		})

		test("error.value is the response body, not another EdenFetchError", () => {
			type Opts = ReturnType<DecorateQueryProcedure<TestDef>["queryOptions"]>
			type Emitted = ErrorOfTag<Opts["queryKey"]>
			type Value404 = Extract<Emitted, { status: 404 }>["value"]

			const exact: Equals<Value404, { message: string }> = true
			type IsNested = Value404 extends { status: number; value: unknown }
				? true
				: false
			const isNested: IsNested = false

			expect(exact).toBe(true)
			expect(isNested).toBe(false)
		})
	})
})

// ============================================================================
// Callable Path Params Tests (eden.users({ id }).get.queryOptions())
// ============================================================================

describe("EdenOptionsProxy callable path params", () => {
	type Proxy = EdenOptionsProxy<App>
	type UsersFn = Proxy["users"]

	describe("proxy.users is callable when :id exists", () => {
		test("users is a callable function", () => {
			// biome-ignore lint/suspicious/noExplicitAny: testing callable
			type IsCallable = UsersFn extends (...args: any[]) => any ? true : false
			const isCallable: IsCallable = true
			expect(isCallable).toBe(true)
		})

		test("users accepts { id } parameter", () => {
			type AcceptsId = UsersFn extends (params: {
				id: string | number
			}) => unknown
				? true
				: false
			const acceptsId: AcceptsId = true
			expect(acceptsId).toBe(true)
		})

		test("users({ id }) return type has get, put, delete", () => {
			type Result = ReturnType<UsersFn>
			type HasGet = "get" extends keyof Result ? true : false
			type HasPut = "put" extends keyof Result ? true : false
			type HasDelete = "delete" extends keyof Result ? true : false

			const hasGet: HasGet = true
			const hasPut: HasPut = true
			const hasDelete: HasDelete = true

			expect(hasGet).toBe(true)
			expect(hasPut).toBe(true)
			expect(hasDelete).toBe(true)
		})
	})

	describe("proxy.users({ id }).get has queryOptions", () => {
		test("get has queryOptions property", () => {
			type Result = ReturnType<UsersFn>
			type GetProc = Result["get"]
			type HasQueryOptions = "queryOptions" extends keyof GetProc ? true : false
			type HasQueryKey = "queryKey" extends keyof GetProc ? true : false

			const hasQueryOptions: HasQueryOptions = true
			const hasQueryKey: HasQueryKey = true

			expect(hasQueryOptions).toBe(true)
			expect(hasQueryKey).toBe(true)
		})
	})

	describe("proxy.users({ id }).put has mutationOptions", () => {
		test("put has mutationOptions property", () => {
			type Result = ReturnType<UsersFn>
			type PutProc = Result["put"]
			type HasMutationOptions = "mutationOptions" extends keyof PutProc
				? true
				: false
			type HasMutationKey = "mutationKey" extends keyof PutProc ? true : false

			const hasMutationOptions: HasMutationOptions = true
			const hasMutationKey: HasMutationKey = true

			expect(hasMutationOptions).toBe(true)
			expect(hasMutationKey).toBe(true)
		})
	})

	describe("proxy.users({ id }).delete has mutationOptions", () => {
		test("delete has mutationOptions property", () => {
			type Result = ReturnType<UsersFn>
			type DeleteProc = Result["delete"]
			type HasMutationOptions = "mutationOptions" extends keyof DeleteProc
				? true
				: false

			const hasMutationOptions: HasMutationOptions = true
			expect(hasMutationOptions).toBe(true)
		})
	})

	describe("proxy.users also has direct .get and .post (for /users without :id)", () => {
		test("users has direct .get property", () => {
			type HasGet = "get" extends keyof UsersFn ? true : false
			const hasGet: HasGet = true
			expect(hasGet).toBe(true)
		})

		test("users has direct .post property", () => {
			type HasPost = "post" extends keyof UsersFn ? true : false
			const hasPost: HasPost = true
			expect(hasPost).toBe(true)
		})
	})
})
