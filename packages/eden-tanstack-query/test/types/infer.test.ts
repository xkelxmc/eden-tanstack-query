/**
 * Type inference tests for Eden TanStack Query
 *
 * These tests verify that types are correctly extracted from Elysia routes.
 * Uses bun:test with compile-time type checking.
 */
import { Elysia, t } from "elysia"

import type {
	EdenFetchError,
	ExtractPathParams,
	ExtractRoutes,
	HttpMutationMethod,
	HttpQueryMethod,
	InferRouteBody,
	InferRouteError,
	InferRouteInput,
	InferRouteOutput,
	InferRouteParams,
	InferRouteQuery,
	IsMutationMethod,
	IsQueryMethod,
	PathParamsToObject,
} from "../../src/types/infer"
import type { Equals, IsNever } from "../../test-utils/type-assert"

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
	// GET route with query params
	.get(
		"/users",
		({ query }) => {
			return [
				{ id: "1", name: query.search ?? "User", email: "user@example.com" },
			]
		},
		{
			query: t.Object({
				search: t.Optional(t.String()),
				limit: t.Optional(t.Number()),
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
	// PUT route with path params and body
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
	// GET route with explicit response status schemas
	.get("/items", ({ query }) => ({ data: `item-${query.id}` }), {
		query: t.Object({ id: t.String() }),
		response: {
			200: t.Object({ data: t.String() }),
			"404": t.Object({ message: t.String() }),
		},
	})
	.get("/no-content", ({ status }) => status(204))
	.get("/reset-content", ({ status }) => status(205, undefined), {
		response: { 205: t.Undefined() },
	})
	.post("/created", ({ status }) => status(201, { id: "created" }), {
		response: {
			201: t.Object({ id: t.String() }),
			409: t.Object({ reason: t.String() }),
		},
	})

type App = typeof app

// ============================================================================
// Runtime Tests (for test runner visibility)
// ============================================================================

describe("Type Inference", () => {
	describe("ExtractPathParams", () => {
		test("extracts single path param", () => {
			type Result = ExtractPathParams<"/users/:id">
			type Check = Result extends "id" ? true : false
			const check: Check = true
			expect(check).toBe(true)
		})

		test("extracts multiple path params", () => {
			type Result = ExtractPathParams<"/users/:id/posts/:postId">
			type HasId = "id" extends Result ? true : false
			type HasPostId = "postId" extends Result ? true : false
			const hasId: HasId = true
			const hasPostId: HasPostId = true
			expect(hasId).toBe(true)
			expect(hasPostId).toBe(true)
		})

		test("returns never for no params", () => {
			type Result = ExtractPathParams<"/users">
			type Check = IsNever<Result>
			const check: Check = true
			expect(check).toBe(true)
		})
	})

	describe("PathParamsToObject", () => {
		test("creates object from path params", () => {
			type Result = PathParamsToObject<"/users/:id">
			type Check = Result extends { id: string } ? true : false
			const check: Check = true
			expect(check).toBe(true)
		})

		test("creates object with multiple params", () => {
			type Result = PathParamsToObject<"/users/:userId/posts/:postId">
			type Check = Result extends { userId: string; postId: string }
				? true
				: false
			const check: Check = true
			expect(check).toBe(true)
		})
	})

	describe("HTTP Method Types", () => {
		test("HttpQueryMethod includes get, options, head", () => {
			type GetIsQuery = "get" extends HttpQueryMethod ? true : false
			type OptionsIsQuery = "options" extends HttpQueryMethod ? true : false
			type HeadIsQuery = "head" extends HttpQueryMethod ? true : false

			const getIsQuery: GetIsQuery = true
			const optionsIsQuery: OptionsIsQuery = true
			const headIsQuery: HeadIsQuery = true

			expect(getIsQuery).toBe(true)
			expect(optionsIsQuery).toBe(true)
			expect(headIsQuery).toBe(true)
		})

		test("HttpMutationMethod includes post, put, patch, delete", () => {
			type PostIsMutation = "post" extends HttpMutationMethod ? true : false
			type PutIsMutation = "put" extends HttpMutationMethod ? true : false
			type PatchIsMutation = "patch" extends HttpMutationMethod ? true : false
			type DeleteIsMutation = "delete" extends HttpMutationMethod ? true : false

			const postIsMutation: PostIsMutation = true
			const putIsMutation: PutIsMutation = true
			const patchIsMutation: PatchIsMutation = true
			const deleteIsMutation: DeleteIsMutation = true

			expect(postIsMutation).toBe(true)
			expect(putIsMutation).toBe(true)
			expect(patchIsMutation).toBe(true)
			expect(deleteIsMutation).toBe(true)
		})

		test("IsQueryMethod correctly identifies query methods", () => {
			type GetIsQuery = IsQueryMethod<"get">
			type PostIsQuery = IsQueryMethod<"post">

			const getIsQuery: GetIsQuery = true
			const postIsNotQuery: PostIsQuery = false

			expect(getIsQuery).toBe(true)
			expect(postIsNotQuery).toBe(false)
		})

		test("IsMutationMethod correctly identifies mutation methods", () => {
			type PostIsMutation = IsMutationMethod<"post">
			type GetIsMutation = IsMutationMethod<"get">

			const postIsMutation: PostIsMutation = true
			const getIsNotMutation: GetIsMutation = false

			expect(postIsMutation).toBe(true)
			expect(getIsNotMutation).toBe(false)
		})
	})

	describe("ExtractRoutes", () => {
		test("extracts routes from app", () => {
			type Routes = ExtractRoutes<App>
			type HasRoutes = Routes extends Record<string, unknown> ? true : false
			const hasRoutes: HasRoutes = true
			expect(hasRoutes).toBe(true)
		})
	})
})

// ============================================================================
// RouteSchema-based type tests (using actual Elysia routes)
// ============================================================================

describe("RouteSchema Type Extraction", () => {
	// Extract actual route schemas from the app's ~Routes
	// Elysia ~Routes structure: { users: { ":id": { get: ... }, get: ..., post: ... } }
	type Routes = ExtractRoutes<App>

	describe("InferRouteParams", () => {
		test("extracts params from route with path params", () => {
			// The route /users/:id has params in its schema
			type UserIdRoute = Routes["users"][":id"]["get"]
			type Params = InferRouteParams<UserIdRoute>

			// Params should include 'id'
			type HasId = "id" extends keyof Params ? true : false
			const hasId: HasId = true
			expect(hasId).toBe(true)
		})
	})

	describe("InferRouteQuery", () => {
		test("extracts query params from GET route", () => {
			type UsersRoute = Routes["users"]["get"]
			type Query = InferRouteQuery<UsersRoute>

			// Query should have search and limit
			type HasSearch = "search" extends keyof Query ? true : false
			type HasLimit = "limit" extends keyof Query ? true : false

			const hasSearch: HasSearch = true
			const hasLimit: HasLimit = true

			expect(hasSearch).toBe(true)
			expect(hasLimit).toBe(true)
		})
	})

	describe("InferRouteBody", () => {
		test("extracts body from POST route", () => {
			type CreateUserRoute = Routes["users"]["post"]
			type Body = InferRouteBody<CreateUserRoute>

			// Body should have name and email
			type HasName = Body extends { name: string } ? true : false
			type HasEmail = Body extends { email: string } ? true : false

			const hasName: HasName = true
			const hasEmail: HasEmail = true

			expect(hasName).toBe(true)
			expect(hasEmail).toBe(true)
		})
	})

	describe("InferRouteInput", () => {
		test("returns only query params for GET routes (path params via proxy)", () => {
			type UserIdRoute = Routes["users"][":id"]["get"]
			type Input = InferRouteInput<UserIdRoute, "get">

			// For GET routes, input is only query params
			// Path params are passed via proxy callable: eden.users({ id: '1' })
			// UserIdRoute has no query params, so input should be empty
			// biome-ignore lint/complexity/noBannedTypes: {} check is intentional for empty object test
			type InputIsEmpty = {} extends Input ? true : false
			const inputIsEmpty: InputIsEmpty = true
			expect(inputIsEmpty).toBe(true)
		})

		test("returns body for POST routes", () => {
			type CreateUserRoute = Routes["users"]["post"]
			type Input = InferRouteInput<CreateUserRoute, "post">

			// For POST, input should be the body
			type IsBodyType = Input extends { name: string; email: string }
				? true
				: false
			const isBodyType: IsBodyType = true
			expect(isBodyType).toBe(true)
		})
	})

	describe("InferRouteOutput", () => {
		test("extracts output type from GET route", () => {
			type UserIdRoute = Routes["users"][":id"]["get"]
			type Output = InferRouteOutput<UserIdRoute>

			// Output should have id, name, email
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

		test("extracts output type from POST route", () => {
			type CreateUserRoute = Routes["users"]["post"]
			type Output = InferRouteOutput<CreateUserRoute>

			// Output should have id, name, email
			type HasId = Output extends { id: string } ? true : false
			type HasName = Output extends { name: string } ? true : false

			const hasId: HasId = true
			const hasName: HasName = true

			expect(hasId).toBe(true)
			expect(hasName).toBe(true)
		})

		test("extracts output type from DELETE route", () => {
			type DeleteUserRoute = Routes["users"][":id"]["delete"]
			type Output = InferRouteOutput<DeleteUserRoute>

			// Output should have deleted and id
			type HasDeleted = Output extends { deleted: boolean } ? true : false
			type HasId = Output extends { id: string } ? true : false

			const hasDeleted: HasDeleted = true
			const hasId: HasId = true

			expect(hasDeleted).toBe(true)
			expect(hasId).toBe(true)
		})
	})
})

// ============================================================================
// EdenFetchError Type Tests
// ============================================================================

describe("EdenFetchError", () => {
	test("has status property", () => {
		type Error = EdenFetchError<500, { message: string }>
		type HasStatus = "status" extends keyof Error ? true : false

		const hasStatus: HasStatus = true
		expect(hasStatus).toBe(true)
	})

	test("has value property", () => {
		type Error = EdenFetchError<500, { message: string }>
		type HasValue = "value" extends keyof Error ? true : false

		const hasValue: HasValue = true
		expect(hasValue).toBe(true)
	})

	test("is an Error subtype with a message property", () => {
		// Eden's runtime EdenFetchError extends Error, so `message` exists —
		// but it is String(value) at runtime (often "[object Object]" for JSON
		// bodies); status/value carry the useful payload.
		type Err = EdenFetchError<500, { message: string }>
		type IsError = Err extends Error ? true : false
		type HasMessage = "message" extends keyof Err ? true : false

		const isError: IsError = true
		const hasMessage: HasMessage = true
		expect(isError).toBe(true)
		expect(hasMessage).toBe(true)
	})

	test("status is typed number", () => {
		type Error = EdenFetchError<404, unknown>
		type StatusType = Error["status"]
		type IsNumber = StatusType extends number ? true : false

		const isNumber: IsNumber = true
		expect(isNumber).toBe(true)
	})

	test("status can be specific status code", () => {
		type Error = EdenFetchError<404, unknown>
		type StatusType = Error["status"]
		type Is404 = StatusType extends 404 ? true : false

		const is404: Is404 = true
		expect(is404).toBe(true)
	})

	test("value is typed", () => {
		type ErrorValue = { code: string; details: string[] }
		type Error = EdenFetchError<400, ErrorValue>
		type ValueType = Error["value"]
		type IsCorrect = ValueType extends ErrorValue ? true : false

		const isCorrect: IsCorrect = true
		expect(isCorrect).toBe(true)
	})

	test("default generic parameters", () => {
		type Error = EdenFetchError
		type StatusIsNumber = Error["status"] extends number ? true : false
		type ValueIsUnknown = unknown extends Error["value"] ? true : false

		const statusIsNumber: StatusIsNumber = true
		const valueIsUnknown: ValueIsUnknown = true

		expect(statusIsNumber).toBe(true)
		expect(valueIsUnknown).toBe(true)
	})

	test("value can contain nested error structure", () => {
		type NestedError = {
			message: string
			errors: Array<{ field: string; reason: string }>
		}
		type Error = EdenFetchError<422, NestedError>

		// Access nested properties through value
		type ValueHasMessage = Error["value"] extends { message: string }
			? true
			: false
		type ValueHasErrors = Error["value"] extends { errors: unknown[] }
			? true
			: false

		const valueHasMessage: ValueHasMessage = true
		const valueHasErrors: ValueHasErrors = true

		expect(valueHasMessage).toBe(true)
		expect(valueHasErrors).toBe(true)
	})
})

// ============================================================================
// InferRouteError Type Tests
// ============================================================================

describe("InferRouteError", () => {
	// Test route schema types
	type RouteWithErrors = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			200: { data: string }
			400: { message: string; code: string }
			404: { message: string }
			500: { error: string }
		}
	}

	type RouteWithOnlySuccess = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			200: { data: string }
		}
	}

	type RouteWithNoResponse = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: unknown
	}

	type RouteWithDeclared503 = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			200: { data: string }
			503: { retryAfter: number }
		}
	}

	test("extracts the exact union of declared error responses", () => {
		type ErrorType = InferRouteError<RouteWithErrors>
		type Expected =
			| EdenFetchError<400, { message: string; code: string }>
			| EdenFetchError<404, { message: string }>
			| EdenFetchError<500, { error: string }>
			| EdenFetchError<503, unknown>

		const exact: Equals<ErrorType, Expected> = true
		expect(exact).toBe(true)
	})

	test("keeps the declared 503 response alongside the transport error", () => {
		type Error503 = Extract<
			InferRouteError<RouteWithDeclared503>,
			{ status: 503 }
		>
		type Expected =
			| EdenFetchError<503, { retryAfter: number }>
			| EdenFetchError<503, unknown>

		const exact: Equals<Error503, Expected> = true
		expect(exact).toBe(true)
	})

	test("falls back to the wide error type when route has only success responses", () => {
		type ErrorType = InferRouteError<RouteWithOnlySuccess>

		type Expected =
			| EdenFetchError<number, unknown>
			| EdenFetchError<503, unknown>
		const exactFallback: Equals<ErrorType, Expected> = true
		expect(exactFallback).toBe(true)
	})

	test("error defaults to EdenFetchError<number, unknown> when no response defined", () => {
		type ErrorType = InferRouteError<RouteWithNoResponse>

		type Expected =
			| EdenFetchError<number, unknown>
			| EdenFetchError<503, unknown>
		const exactFallback: Equals<ErrorType, Expected> = true
		expect(exactFallback).toBe(true)
	})

	test("error narrows by status to the exact declared member", () => {
		type ErrorType = InferRouteError<RouteWithErrors>
		type Error404 = Extract<ErrorType, { status: 404 }>

		const exact: Equals<
			Error404,
			EdenFetchError<404, { message: string }>
		> = true

		expect(exact).toBe(true)
	})
})

// ============================================================================
// InferRouteOutput Status Code Tests
// ============================================================================

describe("InferRouteOutput status codes", () => {
	type Routes = ExtractRoutes<App>

	type RouteWith201Only = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			"201": { id: string }
			422: { message: string }
		}
	}

	type RouteWithMultipleSuccess = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			200: { ok: boolean }
			201: { id: string }
			404: { message: string }
		}
	}

	type RouteWithUncommonSuccess = {
		body: unknown
		params: unknown
		query: unknown
		headers: unknown
		response: {
			299: { ok: true }
			404: { message: string }
		}
	}

	test("infers a quoted 201-only response instead of unknown", () => {
		type Output = InferRouteOutput<RouteWith201Only>
		const exact: Equals<Output, { id: string }> = true
		expect(exact).toBe(true)
	})

	test("unions all declared successful responses", () => {
		type Output = InferRouteOutput<RouteWithMultipleSuccess>
		const exact: Equals<Output, { ok: boolean } | { id: string }> = true
		expect(exact).toBe(true)
	})

	test("treats the full 200-299 range as successful", () => {
		type Output = InferRouteOutput<RouteWithUncommonSuccess>
		type ErrorType = InferRouteError<RouteWithUncommonSuccess>
		type ExpectedError =
			| EdenFetchError<404, { message: string }>
			| EdenFetchError<503, unknown>

		const exactOutput: Equals<Output, { ok: true }> = true
		const exactError: Equals<ErrorType, ExpectedError> = true

		expect(exactOutput).toBe(true)
		expect(exactError).toBe(true)
	})

	test("uses Treaty's empty-string value for bodyless responses", () => {
		type NoContentRoute = Routes["no-content"]["get"]
		type ResetContentRoute = Routes["reset-content"]["get"]

		const implicit204: Equals<InferRouteOutput<NoContentRoute>, ""> = true
		const explicit205: Equals<InferRouteOutput<ResetContentRoute>, ""> = true

		expect(implicit204).toBe(true)
		expect(explicit205).toBe(true)
	})

	test("distributes over a union of real Elysia routes", () => {
		type Route = Routes["items"]["get"] | Routes["created"]["post"]
		type Output = InferRouteOutput<Route>

		const exact: Equals<Output, { data: string } | { id: string }> = true
		expect(exact).toBe(true)
	})
})

// ============================================================================
// InferRouteError against a real Elysia route
// ============================================================================

describe("InferRouteError (real Elysia app)", () => {
	type Routes = ExtractRoutes<App>
	type ItemsRoute = Routes["items"]["get"]
	type CreatedRoute = Routes["created"]["post"]

	test("extracts declared error statuses from a real route", () => {
		type ItemsError = InferRouteError<ItemsRoute>
		type Error404 = Extract<ItemsError, { status: 404 }>

		const quotedKey: Equals<
			Extract<keyof ItemsRoute["response"], "404">,
			"404"
		> = true
		const exact: Equals<
			Error404,
			EdenFetchError<404, { message: string }>
		> = true

		expect(quotedKey).toBe(true)
		expect(exact).toBe(true)
	})

	test("includes Treaty's transport error", () => {
		type Error503 = Extract<InferRouteError<ItemsRoute>, { status: 503 }>

		const exact: Equals<Error503, EdenFetchError<503, unknown>> = true
		expect(exact).toBe(true)
	})

	test("distributes declared errors over a union of real Elysia routes", () => {
		type RouteError = InferRouteError<ItemsRoute | CreatedRoute>
		type Error404 = Extract<RouteError, { status: 404 }>
		type Error409 = Extract<RouteError, { status: 409 }>

		const error404: Equals<
			Error404,
			EdenFetchError<404, { message: string }>
		> = true
		const error409: Equals<
			Error409,
			EdenFetchError<409, { reason: string }>
		> = true

		expect(error404).toBe(true)
		expect(error409).toBe(true)
	})

	test("infers the declared 200 response exactly on a real route", () => {
		type Output = InferRouteOutput<ItemsRoute>
		const exact: Equals<Output, { data: string }> = true
		expect(exact).toBe(true)
	})
})
