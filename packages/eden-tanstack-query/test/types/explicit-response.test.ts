/**
 * Type tests for explicit response types defined via t.* (TypeBox)
 *
 * These tests verify that type inference works correctly when routes
 * explicitly define their response type using t.Object(), t.Array(), etc.
 *
 * IMPORTANT: These tests should FAIL with tsc --noEmit if types become `any`.
 * The pattern: if Output becomes `any`, then `any extends { specific }` is true,
 * but we also check that it's NOT `any` via the IsAny check.
 */
import { Elysia, t } from "elysia"

import type {
	EdenOptionsProxy,
	ExtractRouteDef,
} from "../../src/types/decorators"
import type { ExtractRoutes, InferRouteOutput } from "../../src/types/infer"
import type { IsAny } from "../../src/utils/types"

// ============================================================================
// Test App with Explicit Response Types
// ============================================================================

const UserResponse = t.Object(
	{
		id: t.String(),
		name: t.String(),
		email: t.String(),
	},
	{ additionalProperties: false },
)

const UserListResponse = t.Array(
	t.Object({
		id: t.String(),
		name: t.String(),
		email: t.String(),
	}),
)

const MessageResponse = t.Object({
	message: t.String(),
	timestamp: t.Number(),
})

const DeletedResponse = t.Object({
	deleted: t.Boolean(),
	id: t.String(),
})

const NullableUserResponse = t.Union([
	t.Object({
		id: t.String(),
		name: t.String(),
	}),
	t.Null(),
])

// ============================================================================
// App with explicit response types
// ============================================================================

const app = new Elysia()
	// GET with t.Object response
	.get("/user", () => ({ id: "1", name: "Test", email: "test@example.com" }), {
		response: UserResponse,
	})
	// GET with t.Array response
	.get("/users", () => [{ id: "1", name: "Test", email: "test@example.com" }], {
		response: UserListResponse,
	})
	// GET with path param and t.Object response
	.get(
		"/users/:id",
		({ params }) => ({
			id: params.id,
			name: "Test",
			email: "test@example.com",
		}),
		{
			response: UserResponse,
		},
	)
	// GET with nullable response
	.get(
		"/users/:id/nullable",
		({ params }) =>
			params.id === "0" ? null : { id: params.id, name: "Test" },
		{
			response: NullableUserResponse,
		},
	)
	// POST with body and t.Object response
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
			response: UserResponse,
		},
	)
	// POST with path param and response
	.post(
		"/users/:id/activate",
		({ params }) => ({
			message: `Activated ${params.id}`,
			timestamp: Date.now(),
		}),
		{
			response: MessageResponse,
		},
	)
	// PUT with path param, body and response
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
			response: UserResponse,
		},
	)
	// DELETE with path param and response
	.delete(
		"/users/:id",
		({ params }) => ({
			deleted: true,
			id: params.id,
		}),
		{
			response: DeletedResponse,
		},
	)
	// PATCH with path param, body and response
	.patch(
		"/users/:id",
		({ params, body }) => ({
			id: params.id,
			name: body.name ?? "unchanged",
			email: body.email ?? "unchanged",
		}),
		{
			body: t.Object({
				name: t.Optional(t.String()),
				email: t.Optional(t.String()),
			}),
			response: UserResponse,
		},
	)

type App = typeof app
type Routes = ExtractRoutes<App>
type Proxy = EdenOptionsProxy<App>

// ============================================================================
// CRITICAL: Output must NOT be `any` - these tests MUST fail if types break
// ============================================================================

describe("CRITICAL: Output types must NOT be any with explicit response", () => {
	describe("GET routes output is NOT any", () => {
		test("GET /user with response: t.Object - output is NOT any", () => {
			type Route = Routes["user"]["get"]
			type Output = InferRouteOutput<Route>

			// If Output becomes `any`, IsAny<any> = true, but we expect false
			// This WILL FAIL tsc if Output is any
			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})

		test("GET /users with response: t.Array - output is NOT any", () => {
			type Route = Routes["users"]["get"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})

		test("GET /users/:id with response: t.Object - output is NOT any", () => {
			type Route = Routes["users"][":id"]["get"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})

		test("GET /users/:id/nullable with response: t.Union - output is NOT any", () => {
			type Route = Routes["users"][":id"]["nullable"]["get"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("POST routes output is NOT any", () => {
		test("POST /users with response: t.Object - output is NOT any", () => {
			type Route = Routes["users"]["post"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})

		test("POST /users/:id/activate with response: t.Object - output is NOT any", () => {
			type Route = Routes["users"][":id"]["activate"]["post"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("PUT routes output is NOT any", () => {
		test("PUT /users/:id with response: t.Object - output is NOT any", () => {
			type Route = Routes["users"][":id"]["put"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("DELETE routes output is NOT any", () => {
		test("DELETE /users/:id with response: t.Object - output is NOT any", () => {
			type Route = Routes["users"][":id"]["delete"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("PATCH routes output is NOT any", () => {
		test("PATCH /users/:id with response: t.Object - output is NOT any", () => {
			type Route = Routes["users"][":id"]["patch"]
			type Output = InferRouteOutput<Route>

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})
})

// ============================================================================
// Output has correct structure - these tests verify exact types
// ============================================================================

describe("Output has correct structure with explicit response", () => {
	describe("GET routes have correct output type", () => {
		test("GET /user output has id, name, email", () => {
			type Route = Routes["user"]["get"]
			type Output = InferRouteOutput<Route>

			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false
			type HasEmail = Output extends { email: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})

		test("GET /users output is array of user objects", () => {
			type Route = Routes["users"]["get"]
			type Output = InferRouteOutput<Route>

			type IsArray =
				Output extends Array<{ id: string; name: string; email: string }>
					? true
					: false

			const isArray: IsArray = true
			expect(isArray).toBe(true)
		})

		test("GET /users/:id output has id, name, email", () => {
			type Route = Routes["users"][":id"]["get"]
			type Output = InferRouteOutput<Route>

			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false
			type HasEmail = Output extends { email: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})

		test("GET /users/:id/nullable output can be null", () => {
			type Route = Routes["users"][":id"]["nullable"]["get"]
			type Output = InferRouteOutput<Route>

			type CanBeNull = null extends Output ? true : false
			type CanBeObject = { id: string; name: string } extends Output
				? true
				: false

			const canBeNull: CanBeNull = true
			const canBeObject: CanBeObject = true

			expect(canBeNull).toBe(true)
			expect(canBeObject).toBe(true)
		})
	})

	describe("POST routes have correct output type", () => {
		test("POST /users output has id, name, email", () => {
			type Route = Routes["users"]["post"]
			type Output = InferRouteOutput<Route>

			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false
			type HasEmail = Output extends { email: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})

		test("POST /users/:id/activate output has message, timestamp", () => {
			type Route = Routes["users"][":id"]["activate"]["post"]
			type Output = InferRouteOutput<Route>

			type HasMessage = Output extends { message: string } ? true : false
			type HasTimestamp = Output extends { timestamp: number } ? true : false

			const hasMessage: HasMessage = true
			const hasTimestamp: HasTimestamp = true

			expect(hasMessage).toBe(true)
			expect(hasTimestamp).toBe(true)
		})
	})

	describe("PUT routes have correct output type", () => {
		test("PUT /users/:id output has id, name, email", () => {
			type Route = Routes["users"][":id"]["put"]
			type Output = InferRouteOutput<Route>

			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false
			type HasEmail = Output extends { email: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})
	})

	describe("DELETE routes have correct output type", () => {
		test("DELETE /users/:id output has deleted, id", () => {
			type Route = Routes["users"][":id"]["delete"]
			type Output = InferRouteOutput<Route>

			type HasDeleted = Output extends { deleted: boolean } ? true : false
			type HasId = Output extends { id: string } ? true : false

			const hasDeleted: HasDeleted = true
			const hasId: HasId = true

			expect(hasDeleted).toBe(true)
			expect(hasId).toBe(true)
		})
	})

	describe("PATCH routes have correct output type", () => {
		test("PATCH /users/:id output has id, name, email", () => {
			type Route = Routes["users"][":id"]["patch"]
			type Output = InferRouteOutput<Route>

			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false
			type HasEmail = Output extends { email: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})
	})
})

// ============================================================================
// ExtractRouteDef tests with explicit response
// ============================================================================

describe("ExtractRouteDef with explicit response", () => {
	test("GET route def output is NOT any", () => {
		type Route = Routes["user"]["get"]
		type Def = ExtractRouteDef<Route, "get">

		type OutputIsNotAny = IsAny<Def["output"]> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("GET route def output has correct structure", () => {
		type Route = Routes["user"]["get"]
		type Def = ExtractRouteDef<Route, "get">

		type HasId = Def["output"] extends { id: string } ? true : false
		type HasName = Def["output"] extends { name: string } ? true : false
		type HasEmail = Def["output"] extends { email: string } ? true : false

		const hasId: HasId = true
		const hasName: HasName = true
		const hasEmail: HasEmail = true

		expect(hasId).toBe(true)
		expect(hasName).toBe(true)
		expect(hasEmail).toBe(true)
	})

	test("POST route def output is NOT any", () => {
		type Route = Routes["users"]["post"]
		type Def = ExtractRouteDef<Route, "post">

		type OutputIsNotAny = IsAny<Def["output"]> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("PUT route def output is NOT any", () => {
		type Route = Routes["users"][":id"]["put"]
		type Def = ExtractRouteDef<Route, "put">

		type OutputIsNotAny = IsAny<Def["output"]> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("DELETE route def output is NOT any", () => {
		type Route = Routes["users"][":id"]["delete"]
		type Def = ExtractRouteDef<Route, "delete">

		type OutputIsNotAny = IsAny<Def["output"]> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("PATCH route def output is NOT any", () => {
		type Route = Routes["users"][":id"]["patch"]
		type Def = ExtractRouteDef<Route, "patch">

		type OutputIsNotAny = IsAny<Def["output"]> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})
})

// ============================================================================
// EdenOptionsProxy ~types with explicit response
// ============================================================================

describe("EdenOptionsProxy ~types with explicit response", () => {
	describe("GET routes ~types.output is NOT any", () => {
		test("proxy.users.get ~types.output is NOT any", () => {
			type UsersGet = Proxy["users"]["get"]
			type Output = UsersGet["~types"]["output"]

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})

		test("proxy.users({ id }).get ~types.output is NOT any", () => {
			type UserGet = ReturnType<Proxy["users"]>["get"]
			type Output = UserGet["~types"]["output"]

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("POST routes ~types.output is NOT any", () => {
		test("proxy.users.post ~types.output is NOT any", () => {
			type UsersPost = Proxy["users"]["post"]
			type Output = UsersPost["~types"]["output"]

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("PUT routes ~types.output is NOT any", () => {
		test("proxy.users({ id }).put ~types.output is NOT any", () => {
			type UserPut = ReturnType<Proxy["users"]>["put"]
			type Output = UserPut["~types"]["output"]

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("DELETE routes ~types.output is NOT any", () => {
		test("proxy.users({ id }).delete ~types.output is NOT any", () => {
			type UserDelete = ReturnType<Proxy["users"]>["delete"]
			type Output = UserDelete["~types"]["output"]

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})

	describe("PATCH routes ~types.output is NOT any", () => {
		test("proxy.users({ id }).patch ~types.output is NOT any", () => {
			type UserPatch = ReturnType<Proxy["users"]>["patch"]
			type Output = UserPatch["~types"]["output"]

			type OutputIsNotAny = IsAny<Output> extends true ? false : true
			const outputIsNotAny: OutputIsNotAny = true
			expect(outputIsNotAny).toBe(true)
		})
	})
})

// ============================================================================
// EdenOptionsProxy queryOptions/mutationOptions with explicit response
// ============================================================================

describe("EdenOptionsProxy options methods with explicit response", () => {
	type UsersFn = Proxy["users"]

	describe("GET routes queryOptions works", () => {
		test("proxy.users.get has queryOptions", () => {
			type UsersGet = UsersFn["get"]
			type HasQueryOptions = "queryOptions" extends keyof UsersGet
				? true
				: false

			const hasQueryOptions: HasQueryOptions = true
			expect(hasQueryOptions).toBe(true)
		})

		test("proxy.users({ id }).get has queryOptions", () => {
			type Result = ReturnType<UsersFn>
			type GetProc = Result["get"]
			type HasQueryOptions = "queryOptions" extends keyof GetProc ? true : false

			const hasQueryOptions: HasQueryOptions = true
			expect(hasQueryOptions).toBe(true)
		})
	})

	describe("POST routes mutationOptions works", () => {
		test("proxy.users.post has mutationOptions", () => {
			type UsersPost = UsersFn["post"]
			type HasMutationOptions = "mutationOptions" extends keyof UsersPost
				? true
				: false

			const hasMutationOptions: HasMutationOptions = true
			expect(hasMutationOptions).toBe(true)
		})
	})

	describe("PUT routes mutationOptions works", () => {
		test("proxy.users({ id }).put has mutationOptions", () => {
			type Result = ReturnType<UsersFn>
			type PutProc = Result["put"]
			type HasMutationOptions = "mutationOptions" extends keyof PutProc
				? true
				: false

			const hasMutationOptions: HasMutationOptions = true
			expect(hasMutationOptions).toBe(true)
		})
	})

	describe("DELETE routes mutationOptions works", () => {
		test("proxy.users({ id }).delete has mutationOptions", () => {
			type Result = ReturnType<UsersFn>
			type DeleteProc = Result["delete"]
			type HasMutationOptions = "mutationOptions" extends keyof DeleteProc
				? true
				: false

			const hasMutationOptions: HasMutationOptions = true
			expect(hasMutationOptions).toBe(true)
		})
	})

	describe("PATCH routes mutationOptions works", () => {
		test("proxy.users({ id }).patch has mutationOptions", () => {
			type Result = ReturnType<UsersFn>
			type PatchProc = Result["patch"]
			type HasMutationOptions = "mutationOptions" extends keyof PatchProc
				? true
				: false

			const hasMutationOptions: HasMutationOptions = true
			expect(hasMutationOptions).toBe(true)
		})
	})
})

// ============================================================================
// Mixed routes - with and without explicit response
// ============================================================================

describe("Mixed routes - explicit and inferred response types", () => {
	const mixedApp = new Elysia()
		// WITH explicit response
		.get("/explicit", () => ({ id: "1", name: "Test" }), {
			response: t.Object({ id: t.String(), name: t.String() }),
		})
		// WITHOUT explicit response (inferred)
		.get("/inferred", () => ({ id: "1", name: "Test", extra: true }))

	type MixedRoutes = ExtractRoutes<typeof mixedApp>

	test("explicit response output is NOT any", () => {
		type Route = MixedRoutes["explicit"]["get"]
		type Output = InferRouteOutput<Route>

		type OutputIsNotAny = IsAny<Output> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("inferred response output is NOT any", () => {
		type Route = MixedRoutes["inferred"]["get"]
		type Output = InferRouteOutput<Route>

		type OutputIsNotAny = IsAny<Output> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("explicit response has exact type", () => {
		type Route = MixedRoutes["explicit"]["get"]
		type Output = InferRouteOutput<Route>

		type HasId = Output extends { id: string } ? true : false
		type HasName = Output extends { name: string } ? true : false

		const hasId: HasId = true
		const hasName: HasName = true

		expect(hasId).toBe(true)
		expect(hasName).toBe(true)
	})

	test("inferred response includes extra field", () => {
		type Route = MixedRoutes["inferred"]["get"]
		type Output = InferRouteOutput<Route>

		type HasId = Output extends { id: string } ? true : false
		type HasName = Output extends { name: string } ? true : false
		type HasExtra = Output extends { extra: boolean } ? true : false

		const hasId: HasId = true
		const hasName: HasName = true
		const hasExtra: HasExtra = true

		expect(hasId).toBe(true)
		expect(hasName).toBe(true)
		expect(hasExtra).toBe(true)
	})
})

// ============================================================================
// Route groups with explicit response
// ============================================================================

describe("Route groups with explicit response", () => {
	const groupedApp = new Elysia().group("/api", (app) =>
		app
			.get("/users", () => [{ id: "1", name: "Test" }], {
				response: t.Array(t.Object({ id: t.String(), name: t.String() })),
			})
			.get("/users/:id", ({ params }) => ({ id: params.id, name: "Test" }), {
				response: t.Object({ id: t.String(), name: t.String() }),
			}),
	)

	type GroupedRoutes = ExtractRoutes<typeof groupedApp>

	test("grouped list route output is NOT any", () => {
		type Route = GroupedRoutes["api"]["users"]["get"]
		type Output = InferRouteOutput<Route>

		type OutputIsNotAny = IsAny<Output> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("grouped single route output is NOT any", () => {
		type Route = GroupedRoutes["api"]["users"][":id"]["get"]
		type Output = InferRouteOutput<Route>

		type OutputIsNotAny = IsAny<Output> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("grouped list route is array", () => {
		type Route = GroupedRoutes["api"]["users"]["get"]
		type Output = InferRouteOutput<Route>

		type IsArray =
			Output extends Array<{ id: string; name: string }> ? true : false
		const isArray: IsArray = true
		expect(isArray).toBe(true)
	})

	test("grouped single route has correct structure", () => {
		type Route = GroupedRoutes["api"]["users"][":id"]["get"]
		type Output = InferRouteOutput<Route>

		type HasId = Output extends { id: string } ? true : false
		type HasName = Output extends { name: string } ? true : false

		const hasId: HasId = true
		const hasName: HasName = true

		expect(hasId).toBe(true)
		expect(hasName).toBe(true)
	})
})

// ============================================================================
// Routes with derive and explicit response
// ============================================================================

describe("Routes with derive and explicit response", () => {
	const derivedApp = new Elysia()
		.derive(() => ({
			user: { id: "1", role: "admin" as const },
		}))
		.get(
			"/me",
			({ user }) => ({
				id: user.id,
				role: user.role,
				authenticated: true,
			}),
			{
				response: t.Object({
					id: t.String(),
					role: t.Literal("admin"),
					authenticated: t.Boolean(),
				}),
			},
		)

	type DerivedRoutes = ExtractRoutes<typeof derivedApp>

	test("route with derive output is NOT any", () => {
		type Route = DerivedRoutes["me"]["get"]
		type Output = InferRouteOutput<Route>

		type OutputIsNotAny = IsAny<Output> extends true ? false : true
		const outputIsNotAny: OutputIsNotAny = true
		expect(outputIsNotAny).toBe(true)
	})

	test("route with derive has correct structure", () => {
		type Route = DerivedRoutes["me"]["get"]
		type Output = InferRouteOutput<Route>

		type HasId = Output extends { id: string } ? true : false
		type HasRole = Output extends { role: "admin" } ? true : false
		type HasAuth = Output extends { authenticated: boolean } ? true : false

		const hasId: HasId = true
		const hasRole: HasRole = true
		const hasAuth: HasAuth = true

		expect(hasId).toBe(true)
		expect(hasRole).toBe(true)
		expect(hasAuth).toBe(true)
	})
})
