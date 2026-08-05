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
import {
	type DataTag,
	type InfiniteData,
	type QueryClient,
	skipToken,
	useInfiniteQuery,
} from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import { edenInfiniteQueryOptions } from "../../src/options/infiniteQueryOptions"
import type { EdenOptionsProxy } from "../../src/types/decorators"
import type { Equals } from "../../test-utils/type-assert"

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
type FeedPage = {
	items: { id: string }[]
	next: number | null
}

type ErrorOfTag<TKey> =
	TKey extends DataTag<infer _TKey, infer _TData, infer TError> ? TError : never

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

export function useInfiniteSelectProbe(
	qc: QueryClient,
	eden: EdenOptionsProxy<App>,
) {
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
	const selectedResult = useInfiniteQuery(withSelect)
	const selectedResultExact: Equals<
		typeof selectedResult.data,
		{ id: string }[] | undefined
	> = true

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

	const cached = qc.getQueryData(withoutSelect.queryKey)
	const cachedExact: Equals<
		typeof cached,
		InfiniteData<FeedPage, number | null> | undefined
	> = true
	qc.setQueryData(withoutSelect.queryKey, {
		pages: [{ items: [], next: null }],
		pageParams: [null],
	})
	// @ts-expect-error option-generated keys tag the complete infinite cache entry
	qc.setQueryData(withoutSelect.queryKey, { items: [], next: null })

	const skipped = eden.feed.get.infiniteQueryOptions(skipToken, {
		getNextPageParam: (last) => last.next,
	})
	const skippedCached = qc.getQueryData(skipped.queryKey)
	const skippedCachedExact: Equals<
		typeof skippedCached,
		InfiniteData<FeedPage, number | null> | undefined
	> = true

	const explicitCursor = eden.feed.get.infiniteQueryOptions(
		{},
		{
			initialCursor: 0,
			getNextPageParam: () => 1,
		},
	)
	const explicitCached = qc.getQueryData(explicitCursor.queryKey)
	const explicitCachedExact: Equals<
		typeof explicitCached,
		InfiniteData<FeedPage, number> | undefined
	> = true
	const explicitInitialExact: Equals<
		typeof explicitCursor.initialPageParam,
		number
	> = true

	const manualKey = eden.feed.get.infiniteQueryKey({})
	const manualCached = qc.getQueryData(manualKey)
	const manualCachedExact: Equals<
		typeof manualCached,
		InfiniteData<FeedPage, number | null> | undefined
	> = true
	qc.setQueryData(manualKey, {
		pages: [{ items: [], next: null }],
		pageParams: [null],
	})
	// @ts-expect-error an infinite cache entry contains pages and pageParams
	qc.setQueryData(manualKey, { items: [], next: null })

	const manualFilter = eden.feed.get.infiniteQueryFilter({})
	qc.setQueryData(manualFilter.queryKey, {
		pages: [{ items: [], next: null }],
		pageParams: [null],
	})

	type OptionsError = ErrorOfTag<typeof withoutSelect.queryKey>
	type ManualError = ErrorOfTag<typeof manualKey>
	const manualErrorExact: Equals<ManualError, OptionsError> = true

	return {
		cachedExact,
		explicitCachedExact,
		explicitInitialExact,
		manualCachedExact,
		manualErrorExact,
		pagesExact,
		selectedExact,
		selectedResultExact,
		skippedCachedExact,
	}
}

export function useStandaloneInfiniteSelectProbe(qc: QueryClient) {
	const fetchFeed = async (input: { limit: number; cursor: number }) => ({
		items: [{ id: `${input.limit}-${input.cursor}` }],
		next: input.cursor > 0 ? null : input.cursor + 1,
	})

	const selected = edenInfiniteQueryOptions({
		path: ["feed", "get"],
		input: { limit: 10 },
		initialPageParam: 0,
		fetch: fetchFeed,
		opts: {
			getNextPageParam: (last) => last.next,
			select: (data) => data.pages.flatMap((page) => page.items),
		},
	})
	const selectedResult = useInfiniteQuery(selected)
	const selectedExact: Equals<
		typeof selectedResult.data,
		{ id: string }[] | undefined
	> = true

	const initialData: InfiniteData<FeedPage, number> = {
		pages: [{ items: [], next: null }],
		pageParams: [0],
	}
	const defined = edenInfiniteQueryOptions({
		path: ["feed", "get"],
		input: { limit: 10 },
		initialPageParam: 0,
		fetch: fetchFeed,
		opts: {
			getNextPageParam: (last) => last.next,
			initialData,
			placeholderData: initialData,
		},
	})
	const definedResult = useInfiniteQuery(defined)
	const definedExact: Equals<
		typeof definedResult.data,
		InfiniteData<FeedPage, number>
	> = true
	const cached = qc.getQueryData(defined.queryKey)
	const cachedExact: Equals<
		typeof cached,
		InfiniteData<FeedPage, number> | undefined
	> = true

	const skipped = edenInfiniteQueryOptions({
		path: ["feed", "get"],
		input: skipToken,
		initialPageParam: 0,
		fetch: fetchFeed,
		opts: {
			getNextPageParam: (last) => last.next,
		},
	})
	const skippedCached = qc.getQueryData(skipped.queryKey)
	const skippedExact: Equals<
		typeof skippedCached,
		InfiniteData<FeedPage, number> | undefined
	> = true

	return { cachedExact, definedExact, selectedExact, skippedExact }
}

describe("select soundness (compile-time probes)", () => {
	test("query select probe compiles", () => {
		expect(typeof querySelectProbe).toBe("function")
	})

	test("infinite select probe compiles", () => {
		expect(typeof useInfiniteSelectProbe).toBe("function")
	})

	test("standalone infinite select probe compiles", () => {
		expect(typeof useStandaloneInfiniteSelectProbe).toBe("function")
	})
})
