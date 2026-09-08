import { treaty } from "@elysiajs/eden"
import { hashKey, skipToken } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import { createEdenOptionsProxy } from "../../src"
import { createTestQueryClient } from "../../test-utils"

const app = new Elysia().get(
	"/search/:id",
	({ query, params, request }) => ({
		id: params.id,
		query,
		header: request.headers.get("x-mode"),
	}),
	{
		query: t.Object({
			query: t.Optional(t.Object({ x: t.String() })),
			x: t.Optional(t.String()),
			headers: t.Optional(t.String()),
			cursor: t.Optional(t.String()),
		}),
	},
)
const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
const route = eden.search({ id: "one" }).get
const direct = Object.freeze({ query: Object.freeze({ x: "a" }) })
const wrapped = Object.freeze({ query: direct.query, headers: undefined })
const emptyHeaders = { query: direct.query, headers: {} }

describe("wrapped query cache identity", () => {
	test("fetches distinct direct and wrapped requests and reuses empty-header wrappers", async () => {
		const client = createTestQueryClient()
		const directOptions = route.queryOptions(direct, { staleTime: Infinity })
		const wrappedOptions = route.queryOptions(wrapped, { staleTime: Infinity })

		expect(await client.fetchQuery(directOptions)).toEqual({
			id: "one",
			query: { query: { x: "a" } },
			header: null,
		})
		expect(await client.fetchQuery(wrappedOptions)).toEqual({
			id: "one",
			query: { x: "a" },
			header: null,
		})
		expect(
			await client.fetchQuery(
				route.queryOptions(emptyHeaders, { staleTime: Infinity }),
			),
		).toBe(client.getQueryData(wrappedOptions.queryKey))
		expect(client.getQueryCache().getAll()).toHaveLength(2)
		expect(route.queryKey(wrapped)).toEqual(wrappedOptions.queryKey)
		expect(route.queryFilter(wrapped).queryKey).toEqual([
			wrappedOptions.queryKey[0],
			{ ...wrappedOptions.queryKey[1], type: undefined },
		])
		expect(route.queryKey(direct)[1]).toMatchObject({ input: direct })
		expect(wrapped.headers).toBeUndefined()
		expect(Object.hasOwn(wrapped, "headers")).toBe(true)
	})

	test("keeps infinite identities and cursors separate with custom hashes and exact predicates", async () => {
		const client = createTestQueryClient()
		const settings = {
			initialCursor: "first",
			getNextPageParam: () => undefined,
			staleTime: Infinity,
			queryKeyHashFn: (key: readonly unknown[]) => `custom:${hashKey(key)}`,
		}
		const directOptions = route.infiniteQueryOptions(direct, settings)
		const wrappedOptions = route.infiniteQueryOptions(wrapped, settings)
		const directResult = await client.fetchInfiniteQuery(directOptions)
		const wrappedResult = await client.fetchInfiniteQuery(wrappedOptions)
		expect(directResult.pages[0]?.query).toEqual({
			query: { x: "a" },
			cursor: "first",
		})
		expect(wrappedResult.pages[0]?.query).toEqual({ x: "a", cursor: "first" })
		expect(route.infiniteQueryKey(wrapped, { initialCursor: "first" })).toEqual(
			wrappedOptions.queryKey,
		)
		expect(
			route.infiniteQueryKey(emptyHeaders, { initialCursor: "first" }),
		).toEqual(wrappedOptions.queryKey)
		const predicate = vi.fn(() => true)
		const filter = route.infiniteQueryFilter(wrapped, {
			exact: true,
			initialCursor: "first",
			predicate,
		})
		expect(filter.queryKey).toEqual(wrappedOptions.queryKey)
		expect(
			client
				.getQueryCache()
				.findAll(filter)
				.map((query) => query.queryHash),
		).toEqual([settings.queryKeyHashFn(wrappedOptions.queryKey)])
		expect(predicate).toHaveBeenCalledTimes(1)
		expect(
			client.getQueryCache().findAll(
				route.infiniteQueryFilter(wrapped, {
					exact: true,
					initialCursor: "other",
				}),
			),
		).toHaveLength(0)
		expect(
			client.getQueryCache().findAll(
				route.infiniteQueryFilter(wrapped, {
					exact: true,
					initialCursor: "first",
					predicate: () => false,
				}),
			),
		).toHaveLength(0)
		expect(wrapped).toEqual({ query: { x: "a" }, headers: undefined })
	})

	test("retains partial filters while excluding direct requests from wrapper filters", async () => {
		const client = createTestQueryClient()
		await client.fetchQuery(route.queryOptions(direct))
		await client.fetchQuery(route.queryOptions(wrapped))
		const withHeaders = {
			query: direct.query,
			headers: { "x-mode": "compact" },
		}
		expect(
			(await client.fetchQuery(route.queryOptions(withHeaders))).header,
		).toBe("compact")
		expect(
			client.getQueryCache().findAll(route.queryFilter(direct)),
		).toHaveLength(3)
		expect(
			client.getQueryCache().findAll(route.queryFilter(wrapped)),
		).toHaveLength(2)
		expect(
			client.getQueryCache().findAll(route.queryFilter(withHeaders)),
		).toHaveLength(1)
		expect(
			client
				.getQueryCache()
				.findAll(route.queryFilter(wrapped, { predicate: () => false })),
		).toHaveLength(0)
	})

	test("preserves direct headers fields, path identities and disabled queries", async () => {
		const client = createTestQueryClient()
		const input = Object.freeze({
			query: direct.query,
			headers: undefined,
			x: "extra",
		})
		expect(route.queryKey(input)[1]).toMatchObject({ input: input })
		expect((await client.fetchQuery(route.queryOptions(input))).query).toEqual({
			query: { x: "a" },
			x: "extra",
		})
		const headerField = { headers: "query-value" }
		expect(route.queryKey(headerField)[1]).toMatchObject({ input: headerField })
		expect(
			(await client.fetchQuery(route.queryOptions(headerField))).query,
		).toEqual(headerField)
		expect(hashKey(eden.search({ id: "two" }).get.queryKey(wrapped))).not.toBe(
			hashKey(route.queryKey(wrapped)),
		)
		expect(route.queryOptions(skipToken)).toMatchObject({ enabled: false })
		expect(
			route.infiniteQueryOptions(skipToken, {
				getNextPageParam: () => undefined,
			}),
		).toMatchObject({ enabled: false })
	})
})
