import { treaty } from "@elysiajs/eden"
import { Elysia } from "elysia"

import { createEdenOptionsProxy, type inferOutput } from "../../src"
import type {
	EdenOptionsProxy,
	RouteParamsInput,
} from "../../src/types/decorators"
import type {
	ExtractPathParams,
	PathParamsToObject,
} from "../../src/types/infer"
import { createTestQueryClient } from "../../test-utils"
import type { Equals } from "../../test-utils/type-assert"
import { assertType } from "../../test-utils/type-assert"

const app = new Elysia()
	.get("/:id?", ({ params }) => ({ id: params.id ?? "omitted" }))
	.get("/users/:id?", ({ params }) => ({ id: params.id ?? "omitted" }))
	.get("/groups/:groupId/users/:id?", ({ params }) => ({
		groupId: params.groupId,
		id: params.id ?? "omitted",
	}))
	.get("/restricted", () => "procedure")
	.get("/restricted/get/:id?", () => "restricted")
	.get("/reserved/:id?/get/query", () => "reserved")

const overlappingApp = new Elysia()
	.get("/users", () => ({ users: ["static"] }))
	.get("/users/:id?", ({ params }) => ({ id: params.id ?? "omitted" }))
	.get("/chain", () => ({ static: true }))
	.get("/chain/:id?/:slug?", ({ params }) => ({
		slug: params.slug ?? "omitted",
	}))

const sharedSubtreeApp = new Elysia()
	.get("/prefix/users/foo", () => ({ foo: true }))
	.get("/prefix/:id?/users/bar", ({ params }) => ({
		id: params.id ?? "omitted",
		bar: true,
	}))

const siblingParamsApp = new Elysia()
	.get("/prefix/users/:foo/detail", ({ params }) => ({ foo: params.foo }))
	.get("/prefix/:id?/users/:bar/other", ({ params }) => ({
		id: params.id ?? "omitted",
		bar: params.bar,
	}))

const responsePathApp = new Elysia()
	.get("/prefix/response/foo", () => ({ foo: true }))
	.get("/prefix/:id?/response/bar", () => ({ bar: true }))

const optionalSiblingsApp = new Elysia()
	.get("/foo/:a?/bar/baz", () => ({ baz: true }))
	.get("/foo/:b?/bar/qux", () => ({ qux: true }))
	.get("/calls/:a?/:first/detail", ({ params }) => ({ first: params.first }))
	.get("/calls/:b?/:second/other", ({ params }) => ({ second: params.second }))

type Proxy = EdenOptionsProxy<typeof app>

export function optionalSiblingCalls(
	eden: EdenOptionsProxy<typeof optionalSiblingsApp>,
) {
	assertType<
		Equals<inferOutput<typeof eden.foo.bar.baz.get>, { baz: boolean }>
	>()
	assertType<
		Equals<inferOutput<typeof eden.foo.bar.qux.get>, { qux: boolean }>
	>()
	const first = eden.calls({ first: "first" }).detail
	const second = eden.calls({ second: "second" }).other
	assertType<Equals<inferOutput<typeof first.get>, { first: string }>>()
	assertType<Equals<inferOutput<typeof second.get>, { second: string }>>()
	eden.foo({ a: "selected" }).bar.baz.get.queryOptions()
	eden.foo({ b: "selected" }).bar.qux.get.queryOptions()
	// @ts-expect-error Each omitted call retains its own descendants.
	eden.calls({ first: "first" }).other
	// @ts-expect-error Each supplied call retains its own descendants.
	eden.foo({ a: "selected" }).bar.qux
}

export function siblingPathCalls(
	eden: EdenOptionsProxy<typeof siblingParamsApp>,
) {
	eden.prefix.users({ foo: "direct" }).detail.get.queryOptions()
	eden.prefix.users({ bar: "omitted" }).other.get.queryOptions()
	eden
		.prefix({ id: "selected" })
		.users({ bar: "nested" })
		.other.get.queryOptions()
	// @ts-expect-error A sibling parameter is required.
	eden.prefix.users({})
	// @ts-expect-error Unknown parameter names cannot select a branch.
	eden.prefix.users({ unknown: "value" })
	// @ts-expect-error The foo branch does not expose the bar route.
	eden.prefix.users({ foo: "direct" }).other
	// @ts-expect-error The bar branch does not expose the foo route.
	eden.prefix.users({ bar: "omitted" }).detail
	// @ts-expect-error A supplied id leads only to the bar branch.
	eden.prefix({ id: "selected" }).users({ foo: "direct" })
}

export function optionalPathCalls(eden: Proxy) {
	eden({ id: "root" }).get.queryOptions()
	eden.get.queryOptions()
	eden.users({ id: 42 }).get.queryOptions()
	eden.users.get.queryOptions()
	eden.groups({ groupId: "team" }).users({ id: "user" }).get.queryOptions()
	eden.groups({ groupId: "team" }).users.get.queryOptions()
	// @ts-expect-error The optional marker is not part of the parameter name.
	eden.users({ "id?": "user" })
	// @ts-expect-error Omit the call to skip an optional segment.
	eden.users({})
	// @ts-expect-error Method nodes remain non-callable.
	eden.restricted.get({ id: "user" })
	// @ts-expect-error Procedure-reserved child names remain inaccessible.
	eden.reserved.get.query
	// @ts-expect-error Procedure-reserved child names remain inaccessible with a parameter.
	eden.reserved({ id: "user" }).get.query
}

describe("optional path parameters", () => {
	test("merges omitted descendants under literal response paths", async () => {
		const response = createEdenOptionsProxy<typeof responsePathApp>({
			client: treaty(responsePathApp),
		})
		assertType<
			Equals<
				inferOutput<typeof response.prefix.response.foo.get>,
				{ foo: boolean }
			>
		>()
		assertType<
			Equals<
				inferOutput<typeof response.prefix.response.bar.get>,
				{ bar: boolean }
			>
		>()
		const queryClient = createTestQueryClient()
		try {
			expect(
				await queryClient.fetchQuery(
					response.prefix.response.foo.get.queryOptions(),
				),
			).toEqual({ foo: true })
			expect(
				await queryClient.fetchQuery(
					response.prefix.response.bar.get.queryOptions(),
				),
			).toEqual({ bar: true })
		} finally {
			queryClient.clear()
		}
	})
	test("exposes exact call inputs and matching omitted procedures", () => {
		assertType<Equals<Parameters<Proxy>[0], { id: string | number }>>()
		assertType<Equals<Parameters<Proxy["users"]>[0], { id: string | number }>>()
		assertType<Equals<ReturnType<Proxy>["get"], Proxy["get"]>>()
		assertType<
			Equals<ReturnType<Proxy["users"]>["get"], Proxy["users"]["get"]>
		>()
		assertType<Equals<Proxy["get"]["~types"]["output"], { id: string }>>()
		assertType<
			Equals<RouteParamsInput<{ ":id?": unknown }>, { id: string | number }>
		>()
	})

	test("path helpers strip markers and keep required occurrences required", () => {
		assertType<
			Equals<ExtractPathParams<"/:id?/users/:userId">, "id" | "userId">
		>()
		assertType<Equals<PathParamsToObject<"/:id?">, { id?: string }>>()
		assertType<
			Equals<
				PathParamsToObject<"/users/:id?/posts/:postId">,
				{ id?: string; postId: string }
			>
		>()
		assertType<Equals<PathParamsToObject<"/:id?/:id">, { id: string }>>()
		assertType<Equals<PathParamsToObject<"/:id/:id?">, { id: string }>>()
	})

	test("explicit static routes win over omitted optional routes", async () => {
		const eden = createEdenOptionsProxy<typeof overlappingApp>({
			client: treaty(overlappingApp),
		})
		const user = eden.users({ id: "user" })
		assertType<
			Equals<inferOutput<typeof eden.users.get>, { users: string[] }>
		>()
		assertType<Equals<inferOutput<typeof user.get>, { id: string }>>()
		assertType<
			Equals<inferOutput<typeof eden.chain.get>, { static: boolean }>
		>()

		const queryClient = createTestQueryClient()
		try {
			const users = await queryClient.fetchQuery(eden.users.get.queryOptions())
			const selectedUser = await queryClient.fetchQuery(user.get.queryOptions())
			const chain = await queryClient.fetchQuery(eden.chain.get.queryOptions())
			assertType<Equals<typeof users, { users: string[] }>>()
			assertType<Equals<typeof selectedUser, { id: string }>>()
			assertType<Equals<typeof chain, { static: boolean }>>()
			expect(users).toEqual({ users: ["static"] })
			expect(selectedUser).toEqual({ id: "user" })
			expect(chain).toEqual({ static: true })
		} finally {
			queryClient.clear()
		}
	})

	test("shared subtrees retain direct and omitted children", async () => {
		const eden = createEdenOptionsProxy<typeof sharedSubtreeApp>({
			client: treaty(sharedSubtreeApp),
		})
		const supplied = eden.prefix({ id: "user" }).users.bar
		assertType<
			Equals<inferOutput<typeof eden.prefix.users.foo.get>, { foo: boolean }>
		>()
		assertType<
			Equals<
				inferOutput<typeof eden.prefix.users.bar.get>,
				{ id: string; bar: boolean }
			>
		>()
		assertType<
			Equals<inferOutput<typeof supplied.get>, { id: string; bar: boolean }>
		>()
		const queryClient = createTestQueryClient()
		try {
			const direct = await queryClient.fetchQuery(
				eden.prefix.users.foo.get.queryOptions(),
			)
			const omitted = await queryClient.fetchQuery(
				eden.prefix.users.bar.get.queryOptions(),
			)
			const selected = await queryClient.fetchQuery(supplied.get.queryOptions())
			assertType<Equals<typeof direct, { foo: boolean }>>()
			assertType<Equals<typeof omitted, { id: string; bar: boolean }>>()
			assertType<Equals<typeof selected, { id: string; bar: boolean }>>()
			expect(direct).toEqual({ foo: true })
			expect(omitted).toEqual({ id: "omitted", bar: true })
			expect(selected).toEqual({ id: "user", bar: true })
		} finally {
			queryClient.clear()
		}
	})

	test("merged sibling parameters select their own routes", async () => {
		const eden = createEdenOptionsProxy<typeof siblingParamsApp>({
			client: treaty(siblingParamsApp),
		})
		const direct = eden.prefix.users({ foo: "direct" }).detail
		const omitted = eden.prefix.users({ bar: "omitted" }).other
		const supplied = eden
			.prefix({ id: "selected" })
			.users({ bar: "nested" }).other
		assertType<Equals<inferOutput<typeof direct.get>, { foo: string }>>()
		assertType<
			Equals<inferOutput<typeof omitted.get>, { id: string; bar: string }>
		>()
		assertType<
			Equals<inferOutput<typeof supplied.get>, { id: string; bar: string }>
		>()
		const queryClient = createTestQueryClient()
		try {
			const directResult = await queryClient.fetchQuery(
				direct.get.queryOptions(),
			)
			const suppliedResult = await queryClient.fetchQuery(
				supplied.get.queryOptions(),
			)
			assertType<Equals<typeof directResult, { foo: string }>>()
			assertType<Equals<typeof suppliedResult, { id: string; bar: string }>>()
			expect(directResult).toEqual({ foo: "direct" })
			expect(suppliedResult).toEqual({ id: "selected", bar: "nested" })
		} finally {
			queryClient.clear()
		}
	})

	test("real Treaty reaches supplied and omitted optional routes", async () => {
		const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
		const queryClient = createTestQueryClient()
		try {
			expect(
				await queryClient.fetchQuery(eden({ id: "root" }).get.queryOptions()),
			).toEqual({ id: "root" })
			expect(await queryClient.fetchQuery(eden.get.queryOptions())).toEqual({
				id: "omitted",
			})
			expect(
				await queryClient.fetchQuery(
					eden.users({ id: "user" }).get.queryOptions(),
				),
			).toEqual({ id: "user" })
			expect(
				await queryClient.fetchQuery(eden.users.get.queryOptions()),
			).toEqual({ id: "omitted" })
		} finally {
			queryClient.clear()
		}
	})
})
