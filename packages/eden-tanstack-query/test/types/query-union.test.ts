import { Elysia, t } from "elysia"
import { describe, test } from "vitest"

import type {
	EdenOptionsProxy,
	ExtractRoutes,
	InferRouteInput,
	InferRouteOptions,
	InferRouteQuery,
} from "../../src"
import type { IsAny } from "../../src/utils/types"
import type { Equals } from "../../test-utils/type-assert"
import { assertType } from "../../test-utils/type-assert"

const app = new Elysia()
	.get("/union", ({ query }) => query, {
		query: t.Union([
			t.Object({ name: t.String() }),
			t.Object({ id: t.Number() }),
		]),
	})
	.get("/optional", ({ query }) => query, {
		query: t.Optional(t.Object({ name: t.String() })),
	})

type UnionQuery = { name: string } | { id: number }
type Routes = ExtractRoutes<typeof app>
type QueryRoute<TQuery> = {
	query: TQuery
	params: unknown
	headers: unknown
	body: unknown
	response: { 200: string }
}
// biome-ignore lint/suspicious/noExplicitAny: verifies preservation of an untyped schema
type AnyQuery = any

export function disjointUnionInputProbe(eden: EdenOptionsProxy<typeof app>) {
	eden.union.get.queryOptions({ name: "Ada" })
	eden.union.get.queryOptions({ id: 1 })
	eden.union.get.queryOptions({ query: { name: "Ada" }, headers: undefined })
	eden.union.get.queryOptions({ query: { id: 1 }, headers: undefined })
	// @ts-expect-error each union member requires a query field
	eden.union.get.queryOptions()
	// @ts-expect-error undefined cannot satisfy either union member
	eden.union.get.queryOptions(undefined)
	// @ts-expect-error an empty object cannot satisfy either union member
	eden.union.get.queryOptions({})
	// @ts-expect-error unrelated fields cannot satisfy either union member
	eden.union.get.queryOptions({ unrelated: true })
	// @ts-expect-error branch fields retain their declared types
	eden.union.get.queryOptions({ id: "1" })
}

export function optionalObjectInputProbe(eden: EdenOptionsProxy<typeof app>) {
	eden.optional.get.queryOptions()
	eden.optional.get.queryOptions(undefined)
	eden.optional.get.queryOptions({ name: "Ada" })
}

describe("query union inference", () => {
	test("preserves disjoint unions in exported route helpers", () => {
		assertType<Equals<InferRouteQuery<Routes["union"]["get"]>, UnionQuery>>()
		assertType<Equals<InferRouteInput<Routes["union"]["get"]>, UnionQuery>>()
		assertType<
			Equals<InferRouteOptions<Routes["union"]["get"]>["query"], UnionQuery>
		>()
	})

	test("preserves any and never query schemas", () => {
		assertType<IsAny<InferRouteQuery<QueryRoute<AnyQuery>>>>()
		assertType<IsAny<InferRouteInput<QueryRoute<AnyQuery>>>>()
		assertType<IsAny<InferRouteOptions<QueryRoute<AnyQuery>>["query"]>>()
		assertType<Equals<InferRouteQuery<QueryRoute<never>>, never>>()
		assertType<Equals<InferRouteInput<QueryRoute<never>>, never>>()
		assertType<Equals<InferRouteOptions<QueryRoute<never>>["query"], never>>()
	})

	test("normalizes unknown and empty schemas to optional empty query options", () => {
		assertType<
			Equals<InferRouteQuery<QueryRoute<unknown>>, Record<never, never>>
		>()
		assertType<
			Equals<
				InferRouteQuery<QueryRoute<Record<never, never>>>,
				Record<never, never>
			>
		>()
		assertType<
			Equals<
				InferRouteOptions<QueryRoute<unknown>>["query"],
				Record<never, never> | undefined
			>
		>()
		assertType<
			Equals<
				InferRouteOptions<QueryRoute<Record<never, never>>>["query"],
				Record<never, never> | undefined
			>
		>()
	})
})
