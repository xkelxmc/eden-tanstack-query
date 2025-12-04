/**
 * Integration tests for useInfiniteQuery with Eden TanStack Query
 *
 * Tests the full flow: useEden() -> infiniteQueryOptions() -> useInfiniteQuery()
 * Verifies both runtime behavior and type inference
 */

import type { treaty } from "@elysiajs/eden"
import {
	QueryClient,
	QueryClientProvider,
	useInfiniteQuery,
} from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { Elysia, t } from "elysia"
import type { ReactNode } from "react"

import { createEdenTanStackQuery } from "../../src"

// ============================================================================
// Test App Setup
// ============================================================================

const app = new Elysia()
	.get(
		"/posts",
		({ query }) => ({
			items: [
				{
					id: `post-${query.cursor ?? "1"}`,
					title: `Post ${query.cursor ?? "1"}`,
				},
				{
					id: `post-${(Number(query.cursor) || 1) + 1}`,
					title: `Post ${(Number(query.cursor) || 1) + 1}`,
				},
			],
			nextCursor:
				query.cursor === "3" ? null : String((Number(query.cursor) || 1) + 2),
		}),
		{
			query: t.Object({
				limit: t.Optional(t.Number()),
				cursor: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/comments/:postId",
		({ params, query }) => ({
			items: [
				{
					id: `comment-${query.cursor ?? "1"}`,
					postId: params.postId,
					text: `Comment ${query.cursor ?? "1"}`,
				},
			],
			nextCursor:
				query.cursor === "5" ? null : String((Number(query.cursor) || 1) + 1),
		}),
		{
			params: t.Object({
				postId: t.String(),
			}),
			query: t.Object({
				cursor: t.Optional(t.String()),
			}),
		},
	)

type App = typeof app

// ============================================================================
// Create typed hooks
// ============================================================================

const { EdenProvider, useEden } = createEdenTanStackQuery<App>()

// ============================================================================
// Mock Eden Client
// ============================================================================

function createMockClient() {
	const mockClient = {
		posts: {
			get: async (opts: { query: { limit?: number; cursor?: string } }) => ({
				data: {
					items: [
						{
							id: `post-${opts.query.cursor ?? "1"}`,
							title: `Post ${opts.query.cursor ?? "1"}`,
						},
						{
							id: `post-${(Number(opts.query.cursor) || 1) + 1}`,
							title: `Post ${(Number(opts.query.cursor) || 1) + 1}`,
						},
					],
					nextCursor:
						opts.query.cursor === "3"
							? null
							: String((Number(opts.query.cursor) || 1) + 2),
				},
				error: null,
			}),
		},
		comments: (params: { postId: string }) => ({
			get: async (opts: { query: { cursor?: string } }) => ({
				data: {
					items: [
						{
							id: `comment-${opts.query.cursor ?? "1"}`,
							postId: params.postId,
							text: `Comment ${opts.query.cursor ?? "1"}`,
						},
					],
					nextCursor:
						opts.query.cursor === "5"
							? null
							: String((Number(opts.query.cursor) || 1) + 1),
				},
				error: null,
			}),
		}),
	}

	return mockClient as unknown as ReturnType<typeof treaty<App>>
}

// ============================================================================
// Test Wrapper
// ============================================================================

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})
	const client = createMockClient()

	return {
		queryClient,
		client,
		Wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				<EdenProvider client={client} queryClient={queryClient}>
					{children}
				</EdenProvider>
			</QueryClientProvider>
		),
	}
}

// ============================================================================
// Tests
// ============================================================================

describe("useInfiniteQuery integration", () => {
	describe("basic infinite query flow", () => {
		test("useInfiniteQuery with eden.posts.get.infiniteQueryOptions()", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: (lastPage) =>
									lastPage.nextCursor ?? undefined,
							},
						),
					)
				},
				{ wrapper: Wrapper },
			)

			// Initially loading
			expect(result.current.isLoading).toBe(true)

			// Wait for data
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// Check first page data
			expect(result.current.data?.pages).toHaveLength(1)
			expect(result.current.data?.pages[0]?.items).toHaveLength(2)
			expect(result.current.data?.pages[0]?.items[0]?.id).toBe("post-1")
		})

		test("fetchNextPage loads more data", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: (lastPage) =>
									lastPage.nextCursor ?? undefined,
							},
						),
					)
				},
				{ wrapper: Wrapper },
			)

			// Wait for first page
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// Check hasNextPage
			expect(result.current.hasNextPage).toBe(true)

			// Fetch next page
			result.current.fetchNextPage()

			await waitFor(() => {
				expect(result.current.data?.pages).toHaveLength(2)
			})

			// Verify second page
			expect(result.current.data?.pages[1]?.items[0]?.id).toBe("post-3")
		})

		test("useInfiniteQuery with path params", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useInfiniteQuery(
						eden.comments({ postId: "42" }).get.infiniteQueryOptions(
							{},
							{
								getNextPageParam: (lastPage) =>
									lastPage.nextCursor ?? undefined,
							},
						),
					)
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data?.pages[0]?.items[0]?.postId).toBe("42")
		})
	})

	describe("type inference", () => {
		test("data type is correctly inferred for infinite query", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const query = useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: (lastPage) =>
									lastPage.nextCursor ?? undefined,
							},
						),
					)

					// CRITICAL: Compile-time type check
					// pages should be array of { items: [...], nextCursor: ... }
					if (query.data) {
						const _typeCheck: Array<{
							items: Array<{ id: string; title: string }>
							nextCursor: string | null
						}> = query.data.pages
						void _typeCheck
					}

					return query
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// Runtime check
			expect(result.current.data?.pages[0]?.items[0]?.title).toBe("Post 1")
		})

		test("getNextPageParam receives correct page type", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: (lastPage) => {
									// CRITICAL: Compile-time type check
									// lastPage should have items and nextCursor
									const _typeCheck: {
										items: Array<{ id: string; title: string }>
										nextCursor: string | null
									} = lastPage
									void _typeCheck

									return lastPage.nextCursor ?? undefined
								},
							},
						),
					)
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})
		})

		test("data type is not a function (catches () => never bug)", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const query = useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: (lastPage) =>
									lastPage.nextCursor ?? undefined,
							},
						),
					)

					// Type-level assertion: pages should NOT be a function
					if (query.data) {
						type PagesType = typeof query.data.pages
						type IsNotFunction = PagesType extends (
							...args: unknown[]
						) => unknown
							? false
							: true

						const _isNotFunction: IsNotFunction = true
						void _isNotFunction
					}

					return query
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// Runtime verification
			expect(typeof result.current.data?.pages).not.toBe("function")
			expect(Array.isArray(result.current.data?.pages)).toBe(true)
		})
	})

	describe("infiniteQueryOptions structure", () => {
		test("infiniteQueryOptions has correct queryKey", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.posts.get.infiniteQueryOptions(
						{ limit: 10 },
						{
							getNextPageParam: () => undefined,
						},
					)
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.queryKey[0]).toEqual(["posts", "get"])
			expect(result.current.queryKey[1]).toEqual({
				input: { limit: 10 },
				type: "infinite",
			})
		})

		test("infiniteQueryOptions has eden metadata", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.posts.get.infiniteQueryOptions(
						{ limit: 10 },
						{
							getNextPageParam: () => undefined,
						},
					)
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.eden.path).toBe("posts.get")
		})

		test("infiniteQueryOptions has queryFn", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.posts.get.infiniteQueryOptions(
						{ limit: 10 },
						{
							getNextPageParam: () => undefined,
						},
					)
				},
				{ wrapper: Wrapper },
			)

			expect(typeof result.current.queryFn).toBe("function")
		})

		test("infiniteQueryOptions has initialPageParam", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.posts.get.infiniteQueryOptions(
						{ limit: 10 },
						{
							getNextPageParam: () => undefined,
							initialCursor: "start",
						},
					)
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.initialPageParam).toBe("start")
		})

		test("infiniteQueryOptions defaults initialPageParam to null", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.posts.get.infiniteQueryOptions(
						{ limit: 10 },
						{
							getNextPageParam: () => undefined,
						},
					)
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.initialPageParam).toBe(null)
		})
	})

	describe("error handling", () => {
		function createErrorMockClient() {
			const mockClient = {
				posts: {
					get: async () => ({
						data: null,
						error: { status: 500, value: { message: "Failed to fetch posts" } },
					}),
				},
				comments: (params: { postId: string }) => ({
					get: async () => ({
						data: null,
						error: {
							status: 404,
							value: { message: `Post ${params.postId} not found` },
						},
					}),
				}),
			}
			return mockClient as unknown as ReturnType<typeof treaty<App>>
		}

		function createErrorWrapper() {
			const queryClient = new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
					},
				},
			})
			const client = createErrorMockClient()

			return {
				queryClient,
				client,
				Wrapper: ({ children }: { children: ReactNode }) => (
					<QueryClientProvider client={queryClient}>
						<EdenProvider client={client} queryClient={queryClient}>
							{children}
						</EdenProvider>
					</QueryClientProvider>
				),
			}
		}

		test("useInfiniteQuery handles error state", async () => {
			const { Wrapper } = createErrorWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: () => undefined,
							},
						),
					)
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error).toBeDefined()
		})

		test("error type has status and value properties", async () => {
			const { Wrapper } = createErrorWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const query = useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: () => undefined,
							},
						),
					)

					// CRITICAL: Compile-time type check for error shape
					// EdenFetchError has status and value, NOT message
					if (query.error) {
						type ErrorType = typeof query.error
						type HasStatus = "status" extends keyof ErrorType ? true : false
						type HasValue = "value" extends keyof ErrorType ? true : false

						const _hasStatus: HasStatus = true
						const _hasValue: HasValue = true
						void _hasStatus
						void _hasValue
					}

					return query
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			// Runtime check - error should have status and value
			expect(result.current.error).toHaveProperty("status")
			expect(result.current.error).toHaveProperty("value")
		})

		test("error.value contains error details", async () => {
			const { Wrapper } = createErrorWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: () => undefined,
							},
						),
					)
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error?.status).toBe(500)
			expect(result.current.error?.value).toEqual({
				message: "Failed to fetch posts",
			})
		})

		test("error with path params infinite query", async () => {
			const { Wrapper } = createErrorWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useInfiniteQuery(
						eden.comments({ postId: "999" }).get.infiniteQueryOptions(
							{},
							{
								getNextPageParam: () => undefined,
							},
						),
					)
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error?.status).toBe(404)
			expect(result.current.error?.value).toEqual({
				message: "Post 999 not found",
			})
		})
	})
})
