/**
 * Type soundness tests for `select` interplay with query keys and data.
 *
 * The query key tag must carry what the CACHE stores (TQueryFnData), not the
 * post-select type — otherwise getQueryData lies and setQueryData accepts
 * garbage. Infinite queries must NOT re-wrap the post-select result in
 * InfiniteData.
 *
 * The probe functions below are exported but never called: they exist purely
 * so the compiler checks the assertions inside them.
 */
import type { QueryClient } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import type { EdenOptionsProxy } from "../../src/types/decorators"

/**
 * Strict type equality that catches `any` — one-directional `extends` checks
 * pass vacuously against wide fallback types.
 * Local copy: the canonical helper ships with the test-foundation PR;
 * consolidate on merge.
 */
type Equals<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false

const app = new Elysia()
	.get("/user", () => ({ id: "1", name: "Ada" }))
	.get(
		"/feed",
		({ query }) => ({
			items: [{ id: `item-${query.cursor ?? 0}` }],
			next: ((query.cursor ?? 0) + 1) as number | null,
		}),
		{
			query: t.Object({ cursor: t.Optional(t.Number()) }),
		},
	)

type App = typeof app

export function querySelectProbe(qc: QueryClient, eden: EdenOptionsProxy<App>) {
	const opts = eden.user.get.queryOptions(undefined, {
		select: (data) => data.name,
	})

	// The tag carries the cached shape (TQueryFnData), so reads return what
	// the cache actually stores — not the post-select type.
	const cached = qc.getQueryData(opts.queryKey)
	const cachedExact: Equals<
		typeof cached,
		{ id: string; name: string } | undefined
	> = true

	// @ts-expect-error the post-select value must not be writable into the cache
	qc.setQueryData(opts.queryKey, "just-a-name")

	// The actual cached shape must be writable.
	qc.setQueryData(opts.queryKey, { id: "1", name: "Ada" })

	return { cachedExact }
}

export function infiniteSelectProbe(eden: EdenOptionsProxy<App>) {
	const withSelect = eden.feed.get.infiniteQueryOptions(
		{},
		{
			getNextPageParam: (last) => last.next,
			select: (data) => data.pages.flatMap((page) => page.items),
		},
	)

	// Final data is exactly the select return — NOT re-wrapped in
	// InfiniteData (data.pages would compile and be undefined at runtime).
	type SelectedData = ReturnType<NonNullable<typeof withSelect.select>>
	const selectedExact: Equals<SelectedData, { id: string }[]> = true

	const withoutSelect = eden.feed.get.infiniteQueryOptions(
		{},
		{
			getNextPageParam: (last) => last.next,
		},
	)

	// Without select, data stays InfiniteData over the page type.
	type PlainData = ReturnType<NonNullable<typeof withoutSelect.select>>
	const pagesExact: Equals<
		PlainData["pages"],
		{ items: { id: string }[]; next: number | null }[]
	> = true

	return { selectedExact, pagesExact }
}

describe("select soundness (compile-time probes)", () => {
	test("query select probe compiles", () => {
		expect(typeof querySelectProbe).toBe("function")
	})

	test("infinite select probe compiles", () => {
		expect(typeof infiniteSelectProbe).toBe("function")
	})
})
