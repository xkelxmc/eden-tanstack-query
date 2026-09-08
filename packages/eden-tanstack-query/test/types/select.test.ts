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
	useQuery,
} from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import { edenInfiniteQueryOptions } from "../../src/options/infiniteQueryOptions"
import { edenQueryOptions } from "../../src/options/queryOptions"
import type {
	DecorateInfiniteQueryProcedure,
	DecorateQueryProcedure,
	EdenOptionsProxy,
} from "../../src/types/decorators"
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

type UnionOutput = { kind: "a"; value: string } | { kind: "b"; value: number }

export function customQueryHashProbe(eden: EdenOptionsProxy<App>) {
	const queryKeyHashFn = (key: readonly unknown[]) => JSON.stringify(key)
	eden.user.get.queryOptions(undefined, { queryKeyHashFn })
	eden.feed.get.infiniteQueryOptions(
		{},
		{
			queryKeyHashFn,
			getNextPageParam: (page) => page.next,
		},
	)
	edenQueryOptions({
		path: ["user", "get"],
		input: undefined,
		fetch: async () => ({ id: "1", name: "Ada" }),
		opts: { queryKeyHashFn },
	})
	edenInfiniteQueryOptions({
		path: ["feed", "get"],
		input: {},
		initialPageParam: 0,
		fetch: async () => ({ items: [], next: 1 }),
		opts: { queryKeyHashFn, getNextPageParam: (page) => page.next },
	})
}

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
	maybeCursor?: number,
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
	eden.feed.get.infiniteQueryOptions(
		{},
		{
			// @ts-expect-error feed cursors are numeric
			initialCursor: "start",
			getNextPageParam: () => 1,
		},
	)
	const nullCursor = eden.feed.get.infiniteQueryOptions(
		{},
		{
			initialCursor: null,
			getNextPageParam: () => 1,
		},
	)
	const nullCursorCached = qc.getQueryData(nullCursor.queryKey)
	const nullCursorExact: Equals<
		typeof nullCursorCached,
		InfiniteData<FeedPage, number | null> | undefined
	> = true
	const undefinedCursor = eden.feed.get.infiniteQueryOptions(
		{},
		{
			initialCursor: undefined,
			getNextPageParam: () => 1,
		},
	)
	const undefinedCursorCached = qc.getQueryData(undefinedCursor.queryKey)
	const undefinedCursorExact: Equals<
		typeof undefinedCursorCached,
		InfiniteData<FeedPage, number | null> | undefined
	> = true

	const maybeCursorOptions = eden.feed.get.infiniteQueryOptions(
		{},
		{
			initialCursor: maybeCursor,
			getNextPageParam: () => 1,
		},
	)
	const maybeCursorCached = qc.getQueryData(maybeCursorOptions.queryKey)
	const maybeCursorExact: Equals<
		typeof maybeCursorCached,
		InfiniteData<FeedPage, number | null> | undefined
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
	const manualExplicitKey = eden.feed.get.infiniteQueryKey(
		{},
		{ initialCursor: 0 },
	)
	const manualExplicitCached = qc.getQueryData(manualExplicitKey)
	const manualExplicitExact: Equals<
		typeof manualExplicitCached,
		InfiniteData<FeedPage, number> | undefined
	> = true
	const explicitKeysAgree: Equals<
		typeof manualExplicitKey,
		typeof explicitCursor.queryKey
	> = true
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
		explicitKeysAgree,
		explicitCachedExact,
		explicitInitialExact,
		manualCachedExact,
		manualErrorExact,
		manualExplicitExact,
		maybeCursorExact,
		nullCursorExact,
		pagesExact,
		selectedExact,
		selectedResultExact,
		skippedCachedExact,
		undefinedCursorExact,
	}
}

export function unionPlaceholderProbe(
	qc: QueryClient,
	query: DecorateQueryProcedure<{
		input: Record<never, never>
		output: UnionOutput
		error: Error
	}>,
	infinite: DecorateInfiniteQueryProcedure<{
		input: { cursor?: number }
		output: UnionOutput
		error: Error
	}>,
) {
	const placeholder = { kind: "a", value: "cached" } as const
	const queryOptions = query.queryOptions(undefined, {
		placeholderData: placeholder,
	})
	const queryCached = qc.getQueryData(queryOptions.queryKey)
	const queryExact: Equals<typeof queryCached, UnionOutput | undefined> = true

	const queryWithInitial = query.queryOptions(undefined, {
		initialData: placeholder,
	})
	const queryInitialCached = qc.getQueryData(queryWithInitial.queryKey)
	const queryInitialExact: Equals<
		typeof queryInitialCached,
		UnionOutput | undefined
	> = true

	const infiniteOptions = infinite.infiniteQueryOptions(
		{},
		{
			getNextPageParam: () => undefined,
			placeholderData: {
				pages: [placeholder],
				pageParams: [null],
			},
		},
	)
	const infiniteCached = qc.getQueryData(infiniteOptions.queryKey)
	type InfiniteCached = Exclude<typeof infiniteCached, undefined>
	const infinitePageExact: Equals<
		InfiniteCached["pages"][number],
		UnionOutput
	> = true
	const infinitePageParamExact: Equals<
		InfiniteCached["pageParams"][number],
		number | null
	> = true
	const infiniteExact: Equals<
		typeof infiniteCached,
		InfiniteData<UnionOutput, number | null> | undefined
	> = true

	return {
		infiniteExact,
		infinitePageExact,
		infinitePageParamExact,
		queryExact,
		queryInitialExact,
	}
}

export function useStandaloneQuerySelectProbe(qc: QueryClient) {
	const fetchUser = async (input: { id: string }) => ({
		id: input.id,
		name: "Ada",
	})

	const selected = edenQueryOptions({
		path: ["user", "get"],
		input: { id: "1" },
		fetch: fetchUser,
		opts: { select: (user) => user.name },
	})
	const selectedResult = useQuery(selected)
	const selectedExact: Equals<typeof selectedResult.data, string | undefined> =
		true
	const cached = qc.getQueryData(selected.queryKey)
	const cachedExact: Equals<
		typeof cached,
		{ id: string; name: string } | undefined
	> = true

	const plain = edenQueryOptions({
		path: ["user", "get"],
		input: { id: "1" },
		fetch: fetchUser,
	})
	const plainResult = useQuery(plain)
	const plainExact: Equals<
		typeof plainResult.data,
		{ id: string; name: string } | undefined
	> = true

	const defined = edenQueryOptions({
		path: ["user", "get"],
		input: { id: "1" },
		fetch: fetchUser,
		opts: {
			initialData: { id: "cached", name: "Grace" },
			select: (user) => user.name,
		},
	})
	const definedResult = useQuery(defined)
	const definedExact: Equals<typeof definedResult.data, string> = true

	const skipped = edenQueryOptions({
		path: ["user", "get"],
		input: skipToken,
		fetch: fetchUser,
		opts: { select: (user) => user.name },
	})
	const skippedResult = useQuery(skipped)
	const skippedExact: Equals<typeof skippedResult.data, string | undefined> =
		true

	return { cachedExact, definedExact, plainExact, selectedExact, skippedExact }
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

	const nullable = edenInfiniteQueryOptions<
		{ limit: number },
		FeedPage,
		Error,
		number | null
	>({
		path: ["feed", "get"],
		input: { limit: 10 },
		initialPageParam: null,
		fetch: async (input: { limit: number; cursor: number | null }) => ({
			items: [{ id: `${input.limit}-${input.cursor}` }],
			next: input.cursor,
		}),
		opts: { getNextPageParam: (last) => last.next },
	})
	qc.setQueryData(nullable.queryKey, {
		pages: [{ items: [], next: null }],
		pageParams: [null],
	})
	const nullableCached = qc.getQueryData(nullable.queryKey)
	const nullableCachedExact: Equals<
		typeof nullableCached,
		InfiniteData<FeedPage, number | null> | undefined
	> = true
	const numericCachedAfterNullableWrite = qc.getQueryData(defined.queryKey)
	const numericCachedAfterNullableWriteExact: Equals<
		typeof numericCachedAfterNullableWrite,
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

	const undefinedInitialData = edenInfiniteQueryOptions({
		path: ["feed", "get"],
		input: { limit: 10 },
		initialPageParam: 0,
		fetch: fetchFeed,
		opts: {
			getNextPageParam: (last) => last.next,
			initialData: undefined,
		},
	})
	const undefinedInitialResult = useInfiniteQuery(undefinedInitialData)
	const undefinedInitialExact: Equals<
		typeof undefinedInitialResult.data,
		InfiniteData<FeedPage, number> | undefined
	> = true

	return {
		cachedExact,
		definedExact,
		nullableCachedExact,
		numericCachedAfterNullableWriteExact,
		selectedExact,
		skippedExact,
		undefinedInitialExact,
	}
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

	test("standalone query select probe compiles", () => {
		expect(typeof useStandaloneQuerySelectProbe).toBe("function")
	})

	test("union placeholder probe compiles", () => {
		expect(typeof unionPlaceholderProbe).toBe("function")
	})
})
