import { skipToken } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import type {
	DecorateInfiniteQueryProcedure,
	EdenOptionsProxy,
	HasCursorInput,
} from "../../src/types/decorators"
import type { IsAny } from "../../src/utils/types"
import type { Equals, IsNever } from "../../test-utils/type-assert"
import { assertType } from "../../test-utils/type-assert"

const app = new Elysia()
	.get("/required", ({ query }) => ({ ok: query.role }), {
		query: t.Object({
			role: t.String(),
			limit: t.Number(),
		}),
		headers: t.Object({
			authorization: t.String(),
		}),
	})
	.get("/optionalq", ({ query }) => ({ ok: query.role ?? "" }), {
		query: t.Object({
			role: t.Optional(t.String()),
		}),
	})
	.get("/plain", () => ({ hello: "world" }))
	.get("/search", ({ query }) => query.query, {
		query: t.Object({
			query: t.String(),
			cursor: t.Optional(t.Number()),
		}),
	})
	.get(
		"/paged",
		({ query }) => ({
			items: [query.cursor ?? 0],
			next: (query.cursor ?? 0) + 1,
		}),
		{
			query: t.Object({ cursor: t.Optional(t.Number()) }),
		},
	)
	.get("/nested-cursor", ({ query }) => query.page.cursor, {
		query: t.Object({
			page: t.Object({ cursor: t.Optional(t.Number()) }),
		}),
	})
	.get(
		"/required-cursor",
		({ query }) => ({ items: [query.cursor], next: query.cursor }),
		{ query: t.Object({ cursor: t.String() }) },
	)
	.get(
		"/required-nullable-cursor",
		({ query }) => ({ items: [query.cursor], next: query.cursor }),
		{
			query: t.Object({ cursor: t.Union([t.String(), t.Null()]) }),
		},
	)
	.get("/required-null-cursor", ({ query }) => query.cursor, {
		query: t.Object({ cursor: t.Null() }),
	})
	.get("/any-query", ({ query }) => query, { query: t.Any() })
	.get("/union-cursor", ({ query }) => query, {
		query: t.Union([
			t.Object({
				cursor: t.Optional(t.String()),
				kind: t.Literal("a"),
				a: t.String(),
			}),
			t.Object({
				cursor: t.Optional(t.Number()),
				kind: t.Literal("b"),
				b: t.Number(),
			}),
		]),
	})

type App = typeof app
// biome-ignore lint/suspicious/noExplicitAny: verifies the public any guard
type AnyInput = any

export function requiredInputProbe(eden: EdenOptionsProxy<App>) {
	// @ts-expect-error required query params cannot be omitted entirely
	eden.required.get.queryOptions()
	// @ts-expect-error undefined is not a substitute for required input
	eden.required.get.queryOptions(undefined)
	// @ts-expect-error partial input must still be rejected
	eden.required.get.queryOptions({ role: "admin" })

	eden.required.get.queryOptions({ role: "admin", limit: 10 })
	eden.required.get.queryOptions(
		{ role: "admin", limit: 10 },
		{ staleTime: 1000 },
	)
	eden.required.get.queryOptions({
		role: "admin",
		limit: 10,
		headers: { authorization: "Bearer token" },
	})
	eden.required.get.queryOptions({
		query: { role: "admin", limit: 10 },
		headers: { authorization: "Bearer token" },
	})
	// @ts-expect-error headers cannot replace required query data
	eden.required.get.queryOptions({
		headers: { authorization: "Bearer token" },
	})
	eden.required.get.queryOptions(skipToken)
	eden.required.get.queryOptions(skipToken, { enabled: false })
}

export function optionalInputProbe(eden: EdenOptionsProxy<App>) {
	eden.optionalq.get.queryOptions()
	eden.optionalq.get.queryOptions({ role: "admin" })
	eden.optionalq.get.queryOptions(skipToken)

	eden.plain.get.queryOptions()
	eden.plain.get.queryOptions(undefined, { staleTime: 1000 })
	eden.plain.get.queryOptions(skipToken)

	eden["any-query"].get.queryOptions()
	eden["any-query"].get.queryOptions({ arbitrary: "value" })
	eden["any-query"].get.queryOptions(skipToken)
	eden["any-query"].get.queryKey()
	eden["any-query"].get.queryFilter()
	// @ts-expect-error an untyped query schema does not expose infinite methods
	eden["any-query"].get.infiniteQueryOptions
	// @ts-expect-error an untyped query schema does not expose infinite keys
	eden["any-query"].get.infiniteQueryKey
	// @ts-expect-error an untyped query schema does not expose infinite filters
	eden["any-query"].get.infiniteQueryFilter
}

export function wrappedInputProbe(eden: EdenOptionsProxy<App>) {
	const requiredQuery = { query: { role: "admin", limit: 10 } }
	// @ts-expect-error wrapped input requires an explicit headers key
	eden.required.get.queryOptions(requiredQuery)
	eden.required.get.queryOptions({ ...requiredQuery, headers: undefined })

	// @ts-expect-error optional query fields do not make wrapped headers optional
	eden.optionalq.get.queryOptions({ query: { role: "admin" } })
	eden.optionalq.get.queryOptions({
		query: { role: "admin" },
		headers: undefined,
	})

	eden.search.get.queryOptions({ query: "term" })
	eden.search.get.queryOptions({
		query: { query: "term" },
		headers: undefined,
	})

	const options = { getNextPageParam: () => undefined }
	const wrappedSearch = { query: { query: "term" } }
	// @ts-expect-error infinite wrapped input requires an explicit headers key too
	eden.search.get.infiniteQueryOptions(wrappedSearch, options)
	eden.search.get.infiniteQueryOptions({ query: "term" }, options)
	eden.search.get.infiniteQueryOptions(
		{ ...wrappedSearch, headers: undefined },
		options,
	)
	eden.search.get.infiniteQueryOptions(
		{ ...wrappedSearch, headers: { authorization: "Bearer token" } },
		options,
	)
}

export function cursorGateProbe(eden: EdenOptionsProxy<App>) {
	eden.paged.get.infiniteQueryOptions(
		{},
		{ getNextPageParam: (last) => last.next },
	)
	eden.paged.get.infiniteQueryOptions(skipToken, {
		getNextPageParam: (last) => last.next,
	})
	eden.paged.get.infiniteQueryOptions(skipToken, {
		initialCursor: 0,
		getNextPageParam: (last) => last.next,
	})
	eden.paged.get.infiniteQueryOptions(skipToken, {
		initialCursor: null,
		getNextPageParam: (last) => last.next,
	})
	eden.paged.get.infiniteQueryKey()
	eden.paged.get.infiniteQueryFilter()
	eden.paged.get.infiniteQueryFilter({}, { exact: true })
	eden.paged.get.infiniteQueryFilter({}, { initialCursor: null })
	eden.paged.get.infiniteQueryFilter({}, { initialCursor: undefined })

	// @ts-expect-error options are required
	eden.paged.get.infiniteQueryOptions({})
	// @ts-expect-error input and options are required
	eden.paged.get.infiniteQueryOptions()
	// @ts-expect-error skipToken still requires options
	eden.paged.get.infiniteQueryOptions(skipToken)
	// @ts-expect-error explicit cursors still require getNextPageParam
	eden.paged.get.infiniteQueryOptions(skipToken, { initialCursor: 0 })
	// @ts-expect-error the null default still requires getNextPageParam
	eden.paged.get.infiniteQueryOptions(skipToken, { initialCursor: null })

	// @ts-expect-error no cursor in the (absent) query schema
	eden.plain.get.infiniteQueryOptions
	// @ts-expect-error no cursor in the (absent) query schema
	eden.plain.get.infiniteQueryKey
	// @ts-expect-error no cursor in the query schema
	eden.required.get.infiniteQueryOptions
	// @ts-expect-error a nested cursor does not enable infinite methods
	eden["nested-cursor"].get.infiniteQueryOptions
}

export function requiredCursorProbe(eden: EdenOptionsProxy<App>) {
	const requiredCursor = eden["required-cursor"].get
	const requiredNullableCursor = eden["required-nullable-cursor"].get
	const defaultOptions = { getNextPageParam: () => undefined }
	const nullOptions = {
		initialCursor: null,
		getNextPageParam: () => undefined,
	}
	const undefinedCursorFilter = { initialCursor: undefined }

	requiredCursor.infiniteQueryOptions(
		{},
		{
			initialCursor: "start",
			getNextPageParam: (last) => last.next,
		},
	)
	requiredCursor.infiniteQueryOptions(skipToken, {
		initialCursor: "start",
		getNextPageParam: (last) => last.next,
	})
	requiredCursor.infiniteQueryOptions(
		{},
		{
			initialCursor: "start",
			initialData: {
				pages: [{ items: ["start"], next: "start" }],
				pageParams: ["start"],
			},
			select: (data) => data.pages,
			getNextPageParam: (last) => last.next,
		},
	)
	requiredCursor.infiniteQueryKey(undefined, {
		initialCursor: "start",
	})
	requiredCursor.infiniteQueryFilter()
	requiredCursor.infiniteQueryFilter(
		{},
		{ predicate: (query) => query.queryKey.length > 0, stale: true },
	)
	requiredCursor.infiniteQueryFilter({}, { exact: false })
	requiredCursor.infiniteQueryFilter(
		{},
		{ exact: true, initialCursor: "start" },
	)
	requiredCursor.infiniteQueryFilter(
		{},
		{ exact: false, initialCursor: "start", predicate: () => true },
	)

	// @ts-expect-error a required cursor has no null default
	requiredCursor.infiniteQueryOptions({}, defaultOptions)
	// @ts-expect-error null is removed by Treaty and cannot satisfy a required cursor
	requiredCursor.infiniteQueryOptions({}, nullOptions)
	// @ts-expect-error a required cursor key needs an explicit initial cursor
	requiredCursor.infiniteQueryKey()
	// @ts-expect-error null cannot identify a valid required-cursor query
	requiredCursor.infiniteQueryKey(undefined, {
		initialCursor: null,
	})
	// @ts-expect-error exact required-cursor filters need an explicit cursor
	requiredCursor.infiniteQueryFilter({}, { exact: true })
	// @ts-expect-error null cannot target a required cursor
	requiredCursor.infiniteQueryFilter({}, { initialCursor: null })
	// @ts-expect-error an explicitly undefined cursor is not a broad filter
	requiredCursor.infiniteQueryFilter({}, { initialCursor: undefined })
	// @ts-expect-error variables with an explicitly undefined cursor are rejected too
	requiredCursor.infiniteQueryFilter({}, undefinedCursorFilter)

	requiredNullableCursor.infiniteQueryOptions(
		{},
		{
			initialCursor: "start",
			getNextPageParam: (last) => last.next,
		},
	)
	requiredNullableCursor.infiniteQueryFilter({}, { initialCursor: "start" })
	// @ts-expect-error Treaty omits null query values, so a required nullable cursor has no default
	requiredNullableCursor.infiniteQueryOptions({}, defaultOptions)
	// @ts-expect-error explicit null is omitted on the wire too
	requiredNullableCursor.infiniteQueryOptions({}, nullOptions)
	// @ts-expect-error a required nullable cursor still cannot target null on the wire
	requiredNullableCursor.infiniteQueryFilter({}, { initialCursor: null })

	// @ts-expect-error a required null-only cursor has no wire-usable value
	eden["required-null-cursor"].get.infiniteQueryOptions
	// @ts-expect-error invalid cursor routes do not expose filter helpers
	eden["required-null-cursor"].get.infiniteQueryFilter
	// @ts-expect-error union cursor inputs are not exposed without correlated overloads
	eden["union-cursor"].get.infiniteQueryOptions
	// @ts-expect-error union cursor inputs do not expose filter helpers either
	eden["union-cursor"].get.infiniteQueryFilter
}

export function invalidLowLevelInfiniteFilterProbe(
	nullOnly: DecorateInfiniteQueryProcedure<{
		input: { cursor: null }
		output: unknown
		error: unknown
	}>,
	union: DecorateInfiniteQueryProcedure<{
		input: { cursor?: string } | { cursor?: number }
		output: unknown
		error: unknown
	}>,
	anyInput: DecorateInfiniteQueryProcedure<{
		input: AnyInput
		output: unknown
		error: unknown
	}>,
) {
	// @ts-expect-error low-level decorators reject null-only cursor routes
	nullOnly.infiniteQueryFilter()
	// @ts-expect-error low-level decorators reject unsupported union routes
	union.infiniteQueryFilter()
	// @ts-expect-error low-level decorators reject any inputs
	anyInput.infiniteQueryFilter()
}

describe("input overloads (compile-time probes)", () => {
	test("detects a common top-level cursor key", () => {
		type AnyCursor = { cursor: AnyInput }

		assertType<Equals<HasCursorInput<AnyInput>, false>>()
		assertType<Equals<HasCursorInput<AnyCursor>, false>>()
		assertType<Equals<HasCursorInput<unknown>, false>>()
		assertType<Equals<HasCursorInput<never>, false>>()
		assertType<Equals<HasCursorInput<Record<never, never>>, false>>()
		assertType<Equals<HasCursorInput<Record<string, unknown>>, true>>()
		assertType<Equals<HasCursorInput<{ cursor?: string }>, true>>()
		assertType<Equals<HasCursorInput<{ cursor?: null }>, true>>()
		assertType<Equals<HasCursorInput<{ cursor: string }>, true>>()
		assertType<Equals<HasCursorInput<{ cursor: string | null }>, true>>()
		assertType<Equals<HasCursorInput<{ cursor: unknown }>, true>>()
		assertType<Equals<HasCursorInput<{ limit: number }>, false>>()
		assertType<Equals<HasCursorInput<{ query: { cursor?: string } }>, false>>()
		assertType<Equals<HasCursorInput<{ cursor: null }>, false>>()
		assertType<
			Equals<HasCursorInput<{ cursor: string } | { limit: number }>, false>
		>()
		assertType<
			Equals<HasCursorInput<{ cursor: string } | { cursor?: number }>, false>
		>()

		type Proxy = EdenOptionsProxy<App>
		assertType<
			Equals<IsAny<Proxy["any-query"]["get"]["~types"]["input"]>, true>
		>()
		type PlainInfinite = Extract<
			Proxy["plain"]["get"],
			{ infiniteQueryOptions: unknown }
		>
		type PagedInfinite = Extract<
			Proxy["paged"]["get"],
			{ infiniteQueryOptions: unknown }
		>
		type UnionInfinite = Extract<
			Proxy["union-cursor"]["get"],
			{ infiniteQueryOptions: unknown }
		>
		assertType<Equals<IsNever<PlainInfinite>, true>>()
		assertType<Equals<IsNever<PagedInfinite>, false>>()
		assertType<Equals<IsNever<UnionInfinite>, true>>()
	})
})
