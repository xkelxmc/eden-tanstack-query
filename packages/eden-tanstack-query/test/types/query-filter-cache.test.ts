import { treaty } from "@elysiajs/eden"
import { type InfiniteData, QueryClient } from "@tanstack/react-query"
import { Elysia, t } from "elysia"
import { createEdenOptionsProxy } from "../../src"

const app = new Elysia().get("/items", () => ({ id: "one" }), {
	query: t.Object({ cursor: t.Optional(t.Number()) }),
})
const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })

export function rejectInvalidFilterData(client: QueryClient) {
	const regular = eden.items.get.queryFilter({})
	// @ts-expect-error regular filter keys retain the route response type
	client.setQueryData(regular.queryKey, { id: 1 })
	const infinite = eden.items.get.infiniteQueryFilter({})
	// @ts-expect-error infinite filter keys require pages and pageParams
	client.setQueryData(infinite.queryKey, { id: "one" })
	client.setQueryData(infinite.queryKey, {
		// @ts-expect-error infinite pages retain the route response type
		pages: [{ id: 1 }],
		pageParams: [null],
	})
}

describe("generated filters with the TanStack Query cache", () => {
	test("accepts regular filters and retains their data type", () => {
		const client = new QueryClient()
		const filter = eden.items.get.queryFilter({}, { exact: true })
		client.setQueryData(filter.queryKey, { id: "one" })
		const data = client.getQueryData(filter.queryKey)
		expectTypeOf(data).toEqualTypeOf<{ id: string } | undefined>()
		expect(data).toEqual({ id: "one" })
		expect(client.getQueryCache().findAll(filter)).toHaveLength(1)
		client.clear()
	})

	test("accepts infinite filters and infers page data for cache writes", () => {
		const client = new QueryClient()
		const filter = eden.items.get.infiniteQueryFilter({}, { exact: true })
		client.setQueryData(filter.queryKey, {
			pages: [{ id: "one" }],
			pageParams: [null],
		})
		const data = client.getQueryData(filter.queryKey)
		expectTypeOf(data).toEqualTypeOf<
			InfiniteData<{ id: string }, number | null> | undefined
		>()
		expect(data).toEqual({ pages: [{ id: "one" }], pageParams: [null] })
		expect(client.getQueryCache().findAll(filter)).toHaveLength(1)
		client.clear()
	})
})
