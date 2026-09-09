import { treaty } from "@elysiajs/eden"
import { Elysia, t } from "elysia"
import { createEdenOptionsProxy, type EdenOptionsProxy } from "../../src"
import { createTestQueryClient } from "../../test-utils"

const app = new Elysia()
	.get("/pair", ({ query }) => query, {
		query: t.Object({
			query: t.String(),
			headers: t.String(),
			cursor: t.Optional(t.String()),
		}),
	})
	.get(
		"/named",
		({ query, request }) => ({
			query,
			authorization: request.headers.get("authorization"),
		}),
		{
			query: t.Object({ query: t.String(), cursor: t.Optional(t.String()) }),
		},
	)
	.get("/optional", ({ query }) => query, {
		query: t.Object({ query: t.String(), headers: t.Optional(t.String()) }),
	})
	.get("/mixed", ({ query }) => query, {
		query: t.Union([
			t.Object({ query: t.String() }),
			t.Object({ name: t.String() }),
			t.Object({ query: t.String(), headers: t.String() }),
		]),
	})
	.get("/primitive", ({ query }) => query, { query: t.String() })
	.get("/unknown", ({ query }) => query, { query: t.Unknown() })

export function queryWrapperProbe(eden: EdenOptionsProxy<typeof app>) {
	const flattened = { query: "hello", headers: { authorization: "token" } }
	const settings = { getNextPageParam: () => undefined }
	// @ts-expect-error a query field requires an outer wrapper for transport headers
	eden.named.get.queryOptions(flattened)
	// @ts-expect-error infinite requests have the same ambiguous flattened shape
	eden.named.get.infiniteQueryOptions(flattened, settings)
	const mixed = { ...flattened, name: "Ada" }
	// @ts-expect-error another union branch must not admit an ambiguous structural variable
	eden.mixed.get.queryOptions(mixed)
	const optional: { query: string; headers?: string } = { query: "hello" }
	// @ts-expect-error optional scalar headers can be undefined and look like a wrapper
	eden.optional.get.queryOptions(optional)
	// @ts-expect-error optional scalar headers use the conservative wrapper-only contract
	eden.optional.get.queryOptions({ query: "hello", headers: "value" })
	eden.optional.get.queryOptions({ query: optional, headers: undefined })
	eden.mixed.get.queryOptions({ query: "hello" })
	eden.mixed.get.queryOptions({ name: "Ada" })
	eden.mixed.get.queryOptions({ query: "hello", headers: "value" })
	eden.mixed.get.queryOptions({
		query: { query: "hello" },
		headers: { authorization: "token" },
	})
	eden.primitive.get.queryOptions({ query: "hello", headers: undefined })
	eden.unknown.get.queryOptions({ query: "hello", headers: undefined })
}

describe("query wrapper discrimination", () => {
	test("preserves scalar query and headers fields through Treaty and all six helpers", async () => {
		const native = treaty(app)
		const route = createEdenOptionsProxy<typeof app>({ client: native }).pair
			.get
		const client = createTestQueryClient()
		const input = Object.freeze({ query: "hello", headers: "query-value" })
		expect((await native.pair.get({ query: input })).data).toEqual(input)
		const options = route.queryOptions(input)
		expect(await client.fetchQuery(options)).toEqual(input)
		expect(route.queryKey(input)).toEqual(options.queryKey)
		expect(
			client.getQueryCache().findAll(route.queryFilter(input, { exact: true })),
		).toHaveLength(1)
		const infinite = route.infiniteQueryOptions(input, {
			initialCursor: "first",
			getNextPageParam: () => undefined,
		})
		expect((await client.fetchInfiniteQuery(infinite)).pages).toEqual([
			{ ...input, cursor: "first" },
		])
		expect(route.infiniteQueryKey(input, { initialCursor: "first" })).toEqual(
			infinite.queryKey,
		)
		expect(
			client.getQueryCache().findAll(
				route.infiniteQueryFilter(input, {
					initialCursor: "first",
					exact: true,
				}),
			),
		).toHaveLength(1)
	})

	test("sends a lone query field and an outer wrapper with transport headers", async () => {
		const route = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
			.named.get
		const client = createTestQueryClient()
		const query = { query: "hello" }
		expect(await client.fetchQuery(route.queryOptions(query))).toEqual({
			query,
			authorization: null,
		})
		const wrapped = { query, headers: { authorization: "token" } }
		const options = route.queryOptions(wrapped)
		expect(await client.fetchQuery(options)).toEqual({
			query,
			authorization: "token",
		})
		expect(route.queryKey(wrapped)).toEqual(options.queryKey)
		expect(
			client
				.getQueryCache()
				.findAll(route.queryFilter(wrapped, { exact: true })),
		).toHaveLength(1)
		const infinite = route.infiniteQueryOptions(wrapped, {
			initialCursor: "first",
			getNextPageParam: () => undefined,
		})
		expect((await client.fetchInfiniteQuery(infinite)).pages).toEqual([
			{ query: { ...query, cursor: "first" }, authorization: "token" },
		])
		expect(route.infiniteQueryKey(wrapped, { initialCursor: "first" })).toEqual(
			infinite.queryKey,
		)
		expect(
			client.getQueryCache().findAll(
				route.infiniteQueryFilter(wrapped, {
					initialCursor: "first",
					exact: true,
				}),
			),
		).toHaveLength(1)
	})

	test("unwraps primitive query inputs on unknown-schema routes", async () => {
		const native = treaty(app)
		const route = createEdenOptionsProxy<typeof app>({ client: native }).unknown
			.get
		const client = createTestQueryClient()
		const wrapped = { query: "hello", headers: undefined }
		expect(await client.fetchQuery(route.queryOptions(wrapped))).toEqual({
			0: "h",
			1: "e",
			2: "l",
			3: "l",
			4: "o",
		})
		expect(route.queryKey(wrapped)).toEqual(
			route.queryKey({ query: "hello", headers: {} }),
		)
	})
})
