import { treaty } from "@elysiajs/eden"
import { skipToken } from "@tanstack/react-query"
import { Elysia, t } from "elysia"
import type { EdenOptionsProxy } from "../../src"
import { createEdenOptionsProxy } from "../../src"
import { createTestQueryClient } from "../../test-utils"

const app = new Elysia()
	.get("/object", ({ query }) => query, {
		query: t.Object({ headers: t.Object({ tag: t.String() }) }),
	})
	.get("/optional", ({ query }) => query, {
		query: t.Object({ headers: t.Optional(t.Object({ tag: t.String() })) }),
	})
	.get("/scalar", ({ query }) => query, {
		query: t.Object({ headers: t.String() }),
	})
	.get("/union", ({ query }) => query, {
		query: t.Union([
			t.Object({ name: t.String() }),
			t.Object({ name: t.String(), headers: t.Object({ tag: t.String() }) }),
		]),
	})
	.get("/paged", ({ query }) => query, {
		query: t.Object({
			headers: t.Optional(t.Object({ tag: t.String() })),
			cursor: t.Optional(t.String()),
		}),
	})

type App = typeof app

export function queryHeadersProbe(eden: EdenOptionsProxy<App>) {
	const objectInput = { headers: { tag: "query-value" } }
	const optionalInput: { headers?: { tag: string } } = objectInput
	const unionInput = { name: "Ada", ...objectInput }

	// @ts-expect-error object-valued headers would be consumed as request headers
	eden.object.get.queryOptions(objectInput)
	eden.object.get.queryOptions({ query: objectInput, headers: undefined })
	eden.object.get.queryOptions(skipToken)
	// @ts-expect-error optional fields must not admit structurally typed direct input
	eden.optional.get.queryOptions(optionalInput)
	// @ts-expect-error an ambiguous wrapper must include query explicitly
	eden.optional.get.queryOptions({ headers: undefined })
	eden.optional.get.queryOptions()
	eden.optional.get.queryOptions({ query: optionalInput, headers: undefined })
	eden.scalar.get.queryOptions({ headers: "query-value" })
	// @ts-expect-error the branch without headers must not admit an ambiguous variable
	eden.union.get.queryOptions(unionInput)
	eden.union.get.queryOptions({ name: "Ada" })
	eden.union.get.queryOptions({ query: unionInput, headers: undefined })

	const options = { getNextPageParam: () => undefined }
	// @ts-expect-error infinite inputs must preserve the headers restriction
	eden.paged.get.infiniteQueryOptions(optionalInput, options)
	// @ts-expect-error infinite wrappers also need an explicit query
	eden.paged.get.infiniteQueryOptions({ headers: undefined }, options)
	eden.paged.get.infiniteQueryOptions(
		{ query: optionalInput, headers: undefined },
		options,
	)
	eden.paged.get.infiniteQueryOptions(skipToken, options)

	eden.object.get.queryKey({ headers: {} })
	eden.object.get.queryFilter({ headers: {} })
	eden.paged.get.infiniteQueryKey({ headers: {} })
	eden.paged.get.infiniteQueryFilter({ headers: {} })
}

describe("object-valued headers query fields", () => {
	test("the explicit wrapper sends headers as query data through Treaty", async () => {
		const eden = createEdenOptionsProxy<App>({ client: treaty(app) })
		const queryClient = createTestQueryClient()
		const query = { headers: { tag: "query-value" } }

		const result = await queryClient.fetchQuery(
			eden.object.get.queryOptions({ query, headers: undefined }),
		)

		expect(result).toEqual(query)
	})
})
