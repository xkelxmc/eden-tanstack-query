import type { DataTag } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import type { EdenOptionsProxy } from "../../src/types/decorators"
import type { ExtractRoutes } from "../../src/types/infer"
import type { IsAny, IsNever } from "../../src/utils/types"
import type { Equals } from "../../test-utils/type-assert"
import { assertType } from "../../test-utils/type-assert"

const poisonSegmentsApp = new Elysia()
	.get("/analytics/query", () => ({ rows: 1 }))
	.get("/analytics/summary", () => ({ total: 2 }))
	.get("/a/body", () => ({ ok: 1 }))
	.get("/b/params", () => ({ ok: 2 }))
	.get("/c/headers", () => ({ ok: 3 }))
	.get("/d/response", () => ({ ok: 4 }))
	.get("/e/cookie", () => ({ ok: 5 }))
	.all("/any", () => ({ ok: true }))

const methodsApp = new Elysia()
	.get("/methods/get-route", () => "get")
	.head("/methods/head-route", () => "head")
	.options("/methods/options-route", () => "options")
	.post("/methods/post-route", () => "post")
	.put("/methods/put-route", () => "put")
	.patch("/methods/patch-route", () => "patch")
	.delete("/methods/delete-route", () => "delete")

const procedureWithChildApp = new Elysia()
	.delete("/account", () => "deleted")
	.post("/account/delete", () => "posted")
const reservedMethodChildrenApp = new Elysia()
	.get("/query-case/get/query", () => "query")
	.get("/body-case/get/body", () => "body")
	.get("/params-case/get/params", () => "params")
	.get("/headers-case/get/headers", () => "headers")
	.get("/cookie-case/get/cookie", () => "cookie")
	.get("/response-case/get/response", () => "response")
	.get("/custom-case/get/custom", () => "custom")

const rootParamApp = new Elysia().get("/:id", ({ params }) => params.id)
const rootAllApp = new Elysia().all("/", () => "root")
const dynamicAllApp = new Elysia().all("/:id", ({ params }) => params.id)
const mixedRootAllApp = new Elysia()
	.all("/", () => "root")
	.get("/users", () => "users")
const mixedNestedAllApp = new Elysia()
	.all("/api", () => "api")
	.get("/api/users", () => "users")
const mixedDynamicAllApp = new Elysia()
	.all("/:id", ({ params }) => params.id)
	.get("/:id/users", ({ params }) => params.id)
const allOverridesApp = new Elysia()
	.all("/override", () => ({ common: true }))
	.get(
		"/override",
		({ query, status }) =>
			query.fail
				? status(418, { reason: "teapot" })
				: { common: true, cursor: query.cursor },
		{
			query: t.Object({
				cursor: t.String(),
				fail: t.Optional(t.Boolean()),
			}),
			response: {
				200: t.Object({ common: t.Boolean(), cursor: t.String() }),
				418: t.Object({ reason: t.String() }),
			},
		},
	)
	.head("/override", ({ query }) => query.q, {
		query: t.Object({ q: t.String() }),
	})
	.options("/override", ({ query }) => query.q, {
		query: t.Object({ q: t.String() }),
	})
	.post("/override", ({ body }) => ({ common: true, name: body.name }), {
		body: t.Object({ name: t.String() }),
	})
	.put("/override", ({ body }) => ({ common: true, value: body.value }), {
		body: t.Object({ value: t.Number() }),
	})
	.patch("/override", ({ body }) => ({ common: true, active: body.active }), {
		body: t.Object({ active: t.Boolean() }),
	})
	.delete("/override", ({ body }) => ({ common: true, id: body.id }), {
		body: t.Object({ id: t.String() }),
	})

type PoisonSegmentsProxy = EdenOptionsProxy<typeof poisonSegmentsApp>
type MethodsProxy = EdenOptionsProxy<typeof methodsApp>
type ProcedureWithChildProxy = EdenOptionsProxy<typeof procedureWithChildApp>
type ReservedMethodChildrenProxy = EdenOptionsProxy<
	typeof reservedMethodChildrenApp
>
type RootAllProxy = EdenOptionsProxy<typeof rootAllApp>
type DynamicAllProxy = EdenOptionsProxy<typeof dynamicAllApp>
type AllOverridesProxy = EdenOptionsProxy<typeof allOverridesApp>
type MixedRootAllProxy = EdenOptionsProxy<typeof mixedRootAllApp>
type MixedNestedAllProxy = EdenOptionsProxy<typeof mixedNestedAllApp>
type MixedDynamicAllProxy = EdenOptionsProxy<typeof mixedDynamicAllApp>

type SyntheticAllMethods = "get" | "post" | "put" | "patch" | "delete"

type DataOfTag<TKey> =
	TKey extends DataTag<infer _TKey, infer TData, infer _TError> ? TData : never

type ErrorOfTag<TKey> =
	TKey extends DataTag<infer _TKey, infer _TData, infer TError> ? TError : never

export function poisonSegmentsProbe(eden: PoisonSegmentsProxy) {
	eden.analytics.query.get.queryOptions()
	eden.analytics.summary.get.queryOptions()
	eden.a.body.get.queryOptions()
	eden.b.params.get.queryOptions()
	eden.c.headers.get.queryOptions()
	eden.d.response.get.queryOptions()
	eden.e.cookie.get.queryOptions()
}

export function allRoutesProbe(
	nested: PoisonSegmentsProxy,
	root: RootAllProxy,
	dynamic: DynamicAllProxy,
) {
	nested.any.get.queryOptions()
	nested.any.post.mutationOptions()
	root.get.queryOptions()
	root.delete.mutationOptions()
	dynamic({ id: "1" }).get.queryOptions()
	dynamic({ id: 1 }).patch.mutationOptions()
}

describe("route discrimination", () => {
	test("schema-member-named groups remain routes", () => {
		assertType<Equals<IsAny<PoisonSegmentsProxy["analytics"]>, false>>()
		assertType<Equals<IsNever<PoisonSegmentsProxy["analytics"]>, false>>()
		assertType<Equals<IsNever<PoisonSegmentsProxy["a"]>, false>>()
		assertType<Equals<IsNever<PoisonSegmentsProxy["b"]>, false>>()
		assertType<Equals<IsNever<PoisonSegmentsProxy["c"]>, false>>()
		assertType<Equals<IsNever<PoisonSegmentsProxy["d"]>, false>>()
		assertType<Equals<IsNever<PoisonSegmentsProxy["e"]>, false>>()
	})

	test("all supported methods receive the correct decorator", () => {
		assertType<
			Equals<
				keyof MethodsProxy["methods"]["get-route"]["get"],
				keyof MethodsProxy["methods"]["head-route"]["head"]
			>
		>()
		assertType<
			Equals<
				keyof MethodsProxy["methods"]["get-route"]["get"],
				keyof MethodsProxy["methods"]["options-route"]["options"]
			>
		>()
		assertType<
			Equals<
				keyof MethodsProxy["methods"]["post-route"]["post"],
				keyof MethodsProxy["methods"]["put-route"]["put"]
			>
		>()
		assertType<
			Equals<
				keyof MethodsProxy["methods"]["post-route"]["post"],
				keyof MethodsProxy["methods"]["patch-route"]["patch"]
			>
		>()
		assertType<
			Equals<
				keyof MethodsProxy["methods"]["post-route"]["post"],
				keyof MethodsProxy["methods"]["delete-route"]["delete"]
			>
		>()
		assertType<
			Equals<
				"queryOptions" extends keyof MethodsProxy["methods"]["get-route"]["get"]
					? true
					: false,
				true
			>
		>()
		assertType<
			Equals<
				"mutationOptions" extends keyof MethodsProxy["methods"]["post-route"]["post"]
					? true
					: false,
				true
			>
		>()
	})

	test("procedure nodes retain method-named child routes", () => {
		type DeleteNode = ProcedureWithChildProxy["account"]["delete"]

		assertType<Equals<IsAny<DeleteNode>, false>>()
		assertType<Equals<IsNever<DeleteNode>, false>>()
		assertType<
			Equals<"mutationOptions" extends keyof DeleteNode ? true : false, true>
		>()
		assertType<
			Equals<
				"mutationOptions" extends keyof DeleteNode["post"] ? true : false,
				true
			>
		>()
	})

	test("method-named nodes hide reserved procedure members", () => {
		type QueryNode = ReservedMethodChildrenProxy["query-case"]["get"]
		type BodyNode = ReservedMethodChildrenProxy["body-case"]["get"]
		type ParamsNode = ReservedMethodChildrenProxy["params-case"]["get"]
		type HeadersNode = ReservedMethodChildrenProxy["headers-case"]["get"]
		type CookieNode = ReservedMethodChildrenProxy["cookie-case"]["get"]
		type ResponseNode = ReservedMethodChildrenProxy["response-case"]["get"]
		type CustomNode = ReservedMethodChildrenProxy["custom-case"]["get"]

		assertType<Equals<IsAny<QueryNode>, false>>()
		assertType<Equals<IsNever<QueryNode>, false>>()
		assertType<Equals<"query" extends keyof QueryNode ? true : false, false>>()
		assertType<Equals<"body" extends keyof BodyNode ? true : false, false>>()
		assertType<
			Equals<"params" extends keyof ParamsNode ? true : false, false>
		>()
		assertType<
			Equals<"headers" extends keyof HeadersNode ? true : false, false>
		>()
		assertType<
			Equals<"cookie" extends keyof CookieNode ? true : false, false>
		>()
		assertType<
			Equals<"response" extends keyof ResponseNode ? true : false, false>
		>()
		assertType<Equals<"custom" extends keyof CustomNode ? true : false, true>>()
		assertType<Equals<IsAny<CustomNode["custom"]>, false>>()
		assertType<Equals<IsNever<CustomNode["custom"]>, false>>()
		assertType<
			Equals<
				"queryOptions" extends keyof CustomNode["custom"]["get"] ? true : false,
				true
			>
		>()
	})

	test("standalone all routes expose only sound synthetic methods", () => {
		assertType<Equals<keyof RootAllProxy, SyntheticAllMethods>>()
		assertType<Equals<keyof PoisonSegmentsProxy["any"], SyntheticAllMethods>>()
		assertType<Equals<IsAny<RootAllProxy>, false>>()
		assertType<Equals<IsNever<RootAllProxy>, false>>()
	})

	test("explicit methods override the all schema", () => {
		type Override = AllOverridesProxy["override"]
		type Get = Override["get"]
		type GetKey = ReturnType<Get["queryKey"]>

		assertType<
			Equals<
				Get["~types"]["input"],
				{ cursor: string; fail?: boolean | undefined }
			>
		>()
		assertType<
			Equals<Get["~types"]["output"], { common: boolean; cursor: string }>
		>()
		assertType<
			Equals<
				Extract<Get["~types"]["error"], { status: 418 }>["value"],
				{ reason: string }
			>
		>()
		assertType<Equals<DataOfTag<GetKey>, Get["~types"]["output"]>>()
		assertType<Equals<ErrorOfTag<GetKey>, Get["~types"]["error"]>>()
		assertType<
			Equals<"infiniteQueryOptions" extends keyof Get ? true : false, true>
		>()

		assertType<
			Equals<keyof Override, SyntheticAllMethods | "head" | "options">
		>()
		assertType<Equals<Override["head"]["~types"]["input"], { q: string }>>()
		assertType<Equals<Override["options"]["~types"]["input"], { q: string }>>()
		assertType<Equals<Override["post"]["~types"]["input"], { name: string }>>()
		assertType<Equals<Override["put"]["~types"]["input"], { value: number }>>()
		assertType<
			Equals<Override["patch"]["~types"]["input"], { active: boolean }>
		>()
		assertType<Equals<Override["delete"]["~types"]["input"], { id: string }>>()
	})

	test("string-indexed all maps do not invent unrecoverable child paths", () => {
		type RootRoutes = ExtractRoutes<typeof mixedRootAllApp>
		type NestedRoutes = ExtractRoutes<typeof mixedNestedAllApp>["api"]
		type DynamicRoutes = ExtractRoutes<typeof mixedDynamicAllApp>[":id"]
		type DynamicMethods = MixedDynamicAllProxy extends (params: {
			id: string | number
		}) => infer T
			? T
			: never

		assertType<Equals<string extends keyof RootRoutes ? true : false, true>>()
		assertType<Equals<string extends keyof NestedRoutes ? true : false, true>>()
		assertType<
			Equals<string extends keyof DynamicRoutes ? true : false, true>
		>()
		assertType<
			Equals<"users" extends keyof MixedRootAllProxy ? true : false, false>
		>()
		assertType<
			Equals<
				"users" extends keyof MixedNestedAllProxy["api"] ? true : false,
				false
			>
		>()
		assertType<
			Equals<"users" extends keyof DynamicMethods ? true : false, false>
		>()
	})

	test("root path parameters remain callable", () => {
		type RootParamProxy = EdenOptionsProxy<typeof rootParamApp>

		assertType<Equals<IsAny<RootParamProxy>, false>>()
		assertType<Equals<IsNever<RootParamProxy>, false>>()
		assertType<
			Equals<
				RootParamProxy extends (params: { id: string | number }) => unknown
					? true
					: false,
				true
			>
		>()
	})

	test("dynamic all routes remain callable", () => {
		assertType<Equals<IsAny<DynamicAllProxy>, false>>()
		assertType<Equals<IsNever<DynamicAllProxy>, false>>()
		assertType<
			Equals<
				DynamicAllProxy extends (params: {
					id: string | number
				}) => infer TMethods
					? keyof TMethods
					: never,
				SyntheticAllMethods
			>
		>()
	})
})
