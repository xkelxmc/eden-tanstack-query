import {
	type DataTag,
	type InfiniteData,
	type QueryClient,
	skipToken,
} from "@tanstack/react-query"
import {
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

declare const queryClient: QueryClient
const infiniteCached: InfiniteData<FeedPage, number> | undefined =
	queryClient.getQueryData(infinite.queryKey)
queryClient.setQueryData(infinite.queryKey, {
	pages: [{ items: [], next: null }],
	pageParams: [0],
})

type InfiniteSelected = ReturnType<NonNullable<typeof infinite.select>>
const selected: InfiniteSelected = [{ id: "1" }]

// @ts-expect-error query keys must not degrade to any
const invalidKey: number = skipped.queryKey

void [
	defined,
	infiniteCached,
	infiniteDefined,
	infiniteSkipped,
	invalidKey,
	selected,
	taggedKey,
]
