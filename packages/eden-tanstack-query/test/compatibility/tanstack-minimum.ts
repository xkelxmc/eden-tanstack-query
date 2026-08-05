import {
	type DataTag,
	type InfiniteData,
	type QueryClient,
	skipToken,
} from "@tanstack/react-query"
import {
	type DecorateInfiniteQueryProcedure,
	type DecorateQueryProcedure,
	type EdenQueryKey,
	edenInfiniteQueryOptions,
	edenQueryOptions,
} from "eden-tanstack-react-query"

interface UserInput {
	id: string
}

interface User {
	id: string
}

const fetchUser = async (input: UserInput) => ({ id: input.id })

const enabled = edenQueryOptions({
	path: ["users", "get"],
	input: { id: "1" },
	fetch: fetchUser,
	opts: { staleTime: 1_000 },
})

const defined = edenQueryOptions({
	path: ["users", "get"],
	input: { id: "1" },
	fetch: fetchUser,
	opts: { initialData: { id: "cached" } },
})

const skipped = edenQueryOptions({
	path: ["users", "get"],
	input: skipToken,
	fetch: fetchUser,
})

const taggedKey: DataTag<EdenQueryKey, User, Error> = enabled.queryKey

const selectedQuery = edenQueryOptions({
	path: ["users", "get"],
	input: { id: "1" },
	fetch: fetchUser,
	opts: { select: (user) => user.id },
})

const selectedQueryDefined = edenQueryOptions({
	path: ["users", "get"],
	input: { id: "1" },
	fetch: fetchUser,
	opts: {
		initialData: { id: "cached" },
		select: (user) => user.id,
	},
})

const selectedQuerySkipped = edenQueryOptions({
	path: ["users", "get"],
	input: skipToken,
	fetch: fetchUser,
	opts: { select: (user) => user.id },
})

type SelectedQueryData = ReturnType<NonNullable<typeof selectedQuery.select>>
const selectedQueryData: SelectedQueryData = "1"

interface FeedPage {
	items: User[]
	next: number | null
}

const fetchFeed = async (input: { limit: number; cursor: number }) => ({
	items: [{ id: `${input.limit}-${input.cursor}` }],
	next: input.cursor > 0 ? null : input.cursor + 1,
})

const infinite = edenInfiniteQueryOptions({
	path: ["feed", "get"],
	input: { limit: 10 },
	initialPageParam: 0,
	fetch: fetchFeed,
	opts: {
		getNextPageParam: (last) => last.next,
		select: (data) => data.pages.flatMap((page) => page.items),
	},
})

const infiniteDefined = edenInfiniteQueryOptions({
	path: ["feed", "get"],
	input: { limit: 10 },
	initialPageParam: 0,
	fetch: fetchFeed,
	opts: {
		getNextPageParam: (last) => last.next,
		initialData: {
			pages: [{ items: [], next: null }],
			pageParams: [0],
		},
		placeholderData: {
			pages: [{ items: [], next: null }],
			pageParams: [0],
		},
	},
})

const infiniteSkipped = edenInfiniteQueryOptions({
	path: ["feed", "get"],
	input: skipToken,
	initialPageParam: 0,
	fetch: fetchFeed,
	opts: { getNextPageParam: (last) => last.next },
})

const nullableInfinite = edenInfiniteQueryOptions<
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

declare const queryClient: QueryClient
const selectedQueryCached: User | undefined = queryClient.getQueryData(
	selectedQuery.queryKey,
)
queryClient.setQueryData(selectedQuery.queryKey, { id: "cached" })
const infiniteCached: InfiniteData<FeedPage, number> | undefined =
	queryClient.getQueryData(infinite.queryKey)
queryClient.setQueryData(infinite.queryKey, {
	pages: [{ items: [], next: null }],
	pageParams: [0],
})
queryClient.setQueryData(nullableInfinite.queryKey, {
	pages: [{ items: [], next: null }],
	pageParams: [null],
})

interface UnionQueryDef {
	input: Record<never, never>
	output: { kind: "a"; value: string } | { kind: "b"; value: number }
	error: Error
}

interface UnionInfiniteDef {
	input: { cursor?: number }
	output: UnionQueryDef["output"]
	error: Error
}

declare const queryProcedure: DecorateQueryProcedure<UnionQueryDef>
declare const infiniteProcedure: DecorateInfiniteQueryProcedure<UnionInfiniteDef>

const unionQuery = queryProcedure.queryOptions(undefined, {
	placeholderData: { kind: "a", value: "cached" },
})
queryClient.setQueryData(unionQuery.queryKey, { kind: "b", value: 1 })

const unionInfinite = infiniteProcedure.infiniteQueryOptions(
	{},
	{
		getNextPageParam: () => undefined,
		placeholderData: {
			pages: [{ kind: "a", value: "cached" }],
			pageParams: [null],
		},
	},
)
queryClient.setQueryData(unionInfinite.queryKey, {
	pages: [{ kind: "b", value: 1 }],
	pageParams: [null],
})

const undefinedCursor = infiniteProcedure.infiniteQueryOptions(
	{},
	{
		initialCursor: undefined,
		getNextPageParam: () => 1,
	},
)
queryClient.setQueryData(undefinedCursor.queryKey, {
	pages: [{ kind: "a", value: "cached" }],
	pageParams: [null],
})

declare const optionalCursor: number | undefined
const optionalCursorOptions = infiniteProcedure.infiniteQueryOptions(
	{},
	{
		initialCursor: optionalCursor,
		getNextPageParam: () => 1,
	},
)
queryClient.setQueryData(optionalCursorOptions.queryKey, {
	pages: [{ kind: "a", value: "cached" }],
	pageParams: [null],
})

const nullCursorOptions = infiniteProcedure.infiniteQueryOptions(
	{},
	{
		initialCursor: null,
		getNextPageParam: () => 1,
	},
)
queryClient.setQueryData(nullCursorOptions.queryKey, {
	pages: [{ kind: "a", value: "cached" }],
	pageParams: [null],
})

const explicitCursorOptions = infiniteProcedure.infiniteQueryOptions(
	{},
	{
		initialCursor: 0,
		getNextPageParam: () => 1,
	},
)
const explicitManualKey = infiniteProcedure.infiniteQueryKey(
	{},
	{ initialCursor: 0 },
)
const explicitOptionsKey: typeof explicitManualKey =
	explicitCursorOptions.queryKey
infiniteProcedure.infiniteQueryOptions(
	{},
	{
		// @ts-expect-error feed cursors are numeric
		initialCursor: "start",
		getNextPageParam: () => 1,
	},
)

type InfiniteSelected = ReturnType<NonNullable<typeof infinite.select>>
const selected: InfiniteSelected = [{ id: "1" }]

// @ts-expect-error query keys must not degrade to any
const invalidKey: number = skipped.queryKey

void [
	defined,
	infiniteCached,
	infiniteDefined,
	infiniteSkipped,
	nullableInfinite,
	invalidKey,
	optionalCursorOptions,
	nullCursorOptions,
	explicitOptionsKey,
	selected,
	selectedQueryCached,
	selectedQueryData,
	selectedQueryDefined,
	selectedQuerySkipped,
	taggedKey,
	undefinedCursor,
	unionInfinite,
	unionQuery,
]
