import { treaty } from "@elysiajs/eden"
import { type InfiniteData, skipToken } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import { createEdenOptionsProxy } from "../../src"
import { createTestQueryClient } from "../../test-utils"
import { assertType, type Equals } from "../../test-utils/type-assert"

const app = new Elysia()
	.get(
		"/required",
		({ query }) => ({
			items: [String(query.cursor)],
			next: String(query.cursor) === "0" ? "next" : null,
		}),
		{ query: t.Object({ cursor: t.Union([t.Number(), t.String()]) }) },
	)
	.get(
		"/optional",
		({ query }) => ({
			items: [String(query.cursor)],
			next: String(query.cursor) === "0" ? "next" : null,
		}),
		{
			query: t.Object({
				cursor: t.Optional(t.Union([t.Number(), t.String()])),
			}),
		},
	)

const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
type Page = { items: string[]; next: string | null }

export function explicitOverloadProbe() {
	const defined = eden.required.get.infiniteQueryOptions(
		{},
		{
			initialCursor: 0,
			initialData: { pages: [{ items: ["0"], next: "next" }], pageParams: [0] },
			getNextPageParam: (page, _pages, cursor) => {
				assertType<Equals<typeof cursor, string | number>>()
				return page.next
			},
		},
	)
	const skipped = eden.required.get.infiniteQueryOptions(skipToken, {
		initialCursor: 0,
		getNextPageParam: (page, _pages, cursor) => {
			assertType<Equals<typeof cursor, string | number>>()
			return page.next
		},
	})
	assertType<Equals<typeof defined.initialPageParam, string | number>>()
	assertType<Equals<typeof skipped.initialPageParam, string | number>>()
}

export function explicitGenericProbe() {
	const narrowed = eden.required.get.infiniteQueryOptions<
		Page,
		InfiniteData<Page, number>,
		number
	>(
		{},
		{
			initialCursor: 0,
			getNextPageParam: (_page, _pages, cursor) => {
				assertType<Equals<typeof cursor, number>>()
				return cursor + 1
			},
		},
	)
	assertType<Equals<typeof narrowed.initialPageParam, number>>()

	const numericOptions = eden.required.get.infiniteQueryOptions<
		Page,
		InfiniteData<Page, number>,
		number
	>
	numericOptions(
		{},
		// @ts-expect-error An explicit number page parameter excludes string cursors.
		{ initialCursor: "next", getNextPageParam: () => 1 },
	)
	eden.required.get.infiniteQueryOptions(
		{},
		// @ts-expect-error A required non-nullable cursor cannot start at null.
		{ initialCursor: null, getNextPageParam: () => "next" },
	)
	eden.required.get.infiniteQueryOptions(
		{},
		// @ts-expect-error Boolean cursors are outside the route schema.
		{ initialCursor: true, getNextPageParam: () => "next" },
	)
	eden.required.get.infiniteQueryOptions(
		{},
		// @ts-expect-error A required cursor must have an initial value.
		{ getNextPageParam: () => "next" },
	)
}

describe("mixed cursor pagination", () => {
	it("fetches a string next cursor after starting a required route at zero", async () => {
		const queryClient = createTestQueryClient()
		const options = eden.required.get.infiniteQueryOptions(
			{},
			{
				initialCursor: 0,
				getNextPageParam: (page, _pages, cursor) => {
					assertType<Equals<typeof cursor, string | number>>()
					return page.next
				},
			},
		)
		assertType<Equals<typeof options.initialPageParam, string | number>>()

		try {
			const data = await queryClient.fetchInfiniteQuery({
				...options,
				pages: 2,
			})
			assertType<Equals<typeof data, InfiniteData<Page, string | number>>>()
			expect(data).toEqual({
				pages: [
					{ items: ["0"], next: "next" },
					{ items: ["next"], next: null },
				],
				pageParams: [0, "next"],
			})
		} finally {
			queryClient.clear()
		}
	})

	it("preserves optional cursor inference and the null default", () => {
		const explicit = eden.optional.get.infiniteQueryOptions(
			{},
			{
				initialCursor: 0,
				getNextPageParam: (page) => page.next,
			},
		)
		const defaulted = eden.optional.get.infiniteQueryOptions(
			{},
			{
				getNextPageParam: (page) => page.next,
			},
		)
		assertType<Equals<typeof explicit.initialPageParam, string | number>>()
		assertType<
			Equals<typeof defaulted.initialPageParam, string | number | null>
		>()
		expect(explicit.initialPageParam).toBe(0)
		expect(defaulted.initialPageParam).toBeNull()
	})
})
