import { skipToken } from "@tanstack/react-query"
import { edenInfiniteQueryOptions } from "../../src/options/infiniteQueryOptions"
import { createTestQueryClient } from "../../test-utils"

describe("edenInfiniteQueryOptions", () => {
	const queryClient = createTestQueryClient()

	afterEach(() => {
		queryClient.clear()
	})

	test("creates valid infinite query options", () => {
		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null as string | null,
			fetch: async () => ({ items: [], nextCursor: null }),
			opts: {
				getNextPageParam: (page) => page.nextCursor ?? undefined,
			},
		})

		// Check queryKey structure
		expect(options.queryKey[0]).toEqual(["api", "posts", "get"])
		expect(options.queryKey[1]).toEqual({
			input: { limit: 10 },
			type: "infinite",
		})
		expect(options.eden.path).toBe("api.posts.get")
		expect(options.initialPageParam).toBe(null)
		expect(typeof options.queryFn).toBe("function")
	})

	test("passes pageParam to fetch function", async () => {
		let receivedCursor: unknown

		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null as string | null,
			fetch: async (input) => {
				receivedCursor = input.cursor
				return { items: [], nextCursor: "cursor-123" }
			},
			opts: {
				getNextPageParam: (page) => page.nextCursor ?? undefined,
			},
		})

		// Simulate first page fetch (with initial pageParam)
		const queryFn = options.queryFn as (context: unknown) => Promise<unknown>
		const abortController = new AbortController()
		await queryFn({
			pageParam: null,
			queryKey: options.queryKey,
			signal: abortController.signal,
			direction: "forward",
			meta: undefined,
		})
		expect(receivedCursor).toBe(null)

		// Simulate next page fetch
		await queryFn({
			pageParam: "cursor-123",
			queryKey: options.queryKey,
			signal: abortController.signal,
			direction: "forward",
			meta: undefined,
		})
		expect(receivedCursor).toBe("cursor-123")
	})

	test("handles skipToken", () => {
		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: skipToken,
			initialPageParam: null,
			fetch: async () => ({ items: [], nextCursor: null }),
			opts: {
				getNextPageParam: () => undefined,
			},
		})

		// skipToken is a symbol - verify queryFn is the skipToken symbol
		expect(typeof options.queryFn).toBe("symbol")
		expect(Object.is(options.queryFn, skipToken)).toBe(true)
		// When skipToken, queryKey should not include input
		expect(options.queryKey[0]).toEqual(["api", "posts", "get"])
		expect(options.queryKey[1]).toEqual({ type: "infinite" })
	})

	test("fetches data correctly with queryClient", async () => {
		const mockData = {
			items: [{ id: "1", title: "Post 1" }],
			nextCursor: "cursor-1",
		}

		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null as string | null,
			fetch: async () => mockData,
			opts: {
				getNextPageParam: (page) => page.nextCursor ?? undefined,
			},
		})

		const result = await queryClient.fetchInfiniteQuery(options)
		expect(result.pages).toHaveLength(1)
		expect(result.pages[0]).toEqual(mockData)
	})

	test("passes options through", () => {
		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null,
			fetch: async () => ({ items: [], nextCursor: null }),
			opts: {
				staleTime: 5000,
				refetchOnWindowFocus: false,
				getNextPageParam: () => undefined,
			},
		})

		expect(options.staleTime).toBe(5000)
		expect(options.refetchOnWindowFocus).toBe(false)
	})

	test("supports getPreviousPageParam", () => {
		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null as string | null,
			fetch: async () => ({
				items: [],
				nextCursor: null,
				previousCursor: null,
			}),
			opts: {
				getNextPageParam: (page) => page.nextCursor ?? undefined,
				getPreviousPageParam: (page) => page.previousCursor ?? undefined,
			},
		})

		expect(options.getPreviousPageParam).toBeDefined()
		expect(options.getNextPageParam).toBeDefined()
	})

	test("handles undefined input", () => {
		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: undefined,
			initialPageParam: null,
			fetch: async () => ({ items: [], nextCursor: null }),
			opts: {
				getNextPageParam: () => undefined,
			},
		})

		// Undefined input should result in type: "infinite" only
		expect(options.queryKey[0]).toEqual(["api", "posts", "get"])
		expect(options.queryKey[1]).toEqual({ type: "infinite" })
	})

	test("passes AbortSignal when abortOnUnmount is true", async () => {
		let receivedSignal: AbortSignal | undefined

		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null,
			fetch: async (_input, signal) => {
				receivedSignal = signal
				return { items: [], nextCursor: null }
			},
			opts: {
				getNextPageParam: () => undefined,
				eden: {
					abortOnUnmount: true,
				},
			},
		})

		await queryClient.fetchInfiniteQuery(options)
		expect(receivedSignal).toBeInstanceOf(AbortSignal)
	})

	test("does not pass AbortSignal when abortOnUnmount is false", async () => {
		let receivedSignal: AbortSignal | undefined

		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null,
			fetch: async (_input, signal) => {
				receivedSignal = signal
				return { items: [], nextCursor: null }
			},
			opts: {
				getNextPageParam: () => undefined,
				eden: {
					abortOnUnmount: false,
				},
			},
		})

		await queryClient.fetchInfiniteQuery(options)
		expect(receivedSignal).toBeUndefined()
	})

	test("handles complex input objects", () => {
		const complexInput = {
			filters: { status: "published", category: "tech" },
			limit: 20,
		}

		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "search"],
			input: complexInput,
			initialPageParam: null,
			fetch: async () => ({ items: [], nextCursor: null }),
			opts: {
				getNextPageParam: () => undefined,
			},
		})

		expect(options.queryKey[0]).toEqual(["api", "posts", "search"])
		expect(options.queryKey[1]).toEqual({
			input: complexInput,
			type: "infinite",
		})
	})

	test("includes eden metadata in result", () => {
		const options = edenInfiniteQueryOptions({
			path: ["api", "v1", "posts", "list"],
			input: { limit: 10 },
			initialPageParam: null,
			fetch: async () => ({ items: [], nextCursor: null }),
			opts: {
				getNextPageParam: () => undefined,
			},
		})

		expect(options.eden).toEqual({
			path: "api.v1.posts.list",
		})
	})

	test("handles fetch errors", async () => {
		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: null,
			fetch: async () => {
				throw new Error("Failed to fetch posts")
			},
			opts: {
				getNextPageParam: () => undefined,
			},
		})

		await expect(queryClient.fetchInfiniteQuery(options)).rejects.toThrow(
			"Failed to fetch posts",
		)
	})

	test("handles numeric page params", async () => {
		let receivedPage: number | undefined

		const options = edenInfiniteQueryOptions({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			initialPageParam: 1,
			fetch: async (input) => {
				receivedPage = input.cursor
				return { items: [], totalPages: 5 }
			},
			opts: {
				getNextPageParam: (page, _allPages, lastPageParam) =>
					lastPageParam < page.totalPages ? lastPageParam + 1 : undefined,
			},
		})

		// Simulate first page fetch
		const queryFn = options.queryFn as (context: unknown) => Promise<unknown>
		const abortController = new AbortController()
		await queryFn({
			pageParam: 1,
			queryKey: options.queryKey,
			signal: abortController.signal,
			direction: "forward",
			meta: undefined,
		})
		expect(receivedPage).toBe(1)

		// Simulate second page fetch
		await queryFn({
			pageParam: 2,
			queryKey: options.queryKey,
			signal: abortController.signal,
			direction: "forward",
			meta: undefined,
		})
		expect(receivedPage).toBe(2)
	})
})
