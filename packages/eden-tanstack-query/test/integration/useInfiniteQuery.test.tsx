/**
 * Integration tests for useInfiniteQuery with Eden TanStack Query
 *
 * Tests the full flow: useEden() -> infiniteQueryOptions() -> useInfiniteQuery()
 * Verifies both runtime behavior and type inference
 */

import type { treaty } from "@elysiajs/eden"
import {
	type InfiniteData,
	QueryClient,
	QueryClientProvider,
	useInfiniteQuery,
} from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { Elysia, t } from "elysia"
import type { ReactNode } from "react"

import { createEdenTanStackQuery } from "../../src"
import { assertType, type Equals } from "../../test-utils/type-assert"

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

function createWrapper(client = createMockClient()) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<EdenProvider client={client} queryClient={queryClient}>
					{children}
				</EdenProvider>
			</QueryClientProvider>
		)
	}
}

// ============================================================================
// Tests
// ============================================================================

describe("useInfiniteQuery integration", () => {
	describe("basic infinite query flow", () => {
		test("useInfiniteQuery with eden.posts.get.infiniteQueryOptions()", async () => {
			const Wrapper = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const query = useInfiniteQuery(
						eden.posts.get.infiniteQueryOptions(
							{ limit: 10 },
							{
								getNextPageParam: (lastPage) => {
									assertType<
										Equals<
											typeof lastPage,
											{
												items: { id: string; title: string }[]
												nextCursor: string | null
											}
										>
									>()
									return lastPage.nextCursor ?? undefined
								},
							},
						),
					)
					assertType<
						Equals<
							typeof query.data,
							| InfiniteData<
									{
										items: { id: string; title: string }[]
										nextCursor: string | null
									},
									string | null
							  >
							| undefined
						>
					>()
					return query
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
			expect(Array.isArray(result.current.data?.pages)).toBe(true)
			expect(result.current.data?.pages).toHaveLength(1)
			expect(result.current.data?.pages[0]?.items).toHaveLength(2)
			expect(result.current.data?.pages[0]?.items[0]?.id).toBe("post-1")
			expect(result.current.data?.pages[0]?.items[0]?.title).toBe("Post 1")
		})

		test("fetchNextPage loads more data", async () => {
			const Wrapper = createWrapper()

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
			const Wrapper = createWrapper()

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

	describe("infiniteQueryOptions structure", () => {
		test("infiniteQueryOptions exposes its key, metadata and function", () => {
			const Wrapper = createWrapper()

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
				infinite: { initialPageParam: null },
			})
			expect(result.current.eden.path).toBe("posts.get")
			expect(typeof result.current.queryFn).toBe("function")
			expect(result.current.initialPageParam).toBe(null)
		})

		test("infiniteQueryOptions has initialPageParam", () => {
			const Wrapper = createWrapper()

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

		test("useInfiniteQuery preserves error state and undeclared error details", async () => {
			const Wrapper = createWrapper(createErrorMockClient())

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

					if (query.error) {
						type ErrorType = typeof query.error
						type HasStatus = "status" extends keyof ErrorType ? true : false
						type HasValue = "value" extends keyof ErrorType ? true : false

						const _hasStatus: HasStatus = true
						const _hasValue: HasValue = true
						void _hasStatus
						void _hasValue

						type ValueType = ErrorType["value"]

						type IsNotNever = [ValueType] extends [never] ? false : true
						const _isNotNever: IsNotNever = true
						void _isNotNever

						const _value: unknown = query.error.value
						void _value
					}

					return query
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error).toHaveProperty("status")
			expect(result.current.error).toHaveProperty("value")
			expect(result.current.error).toBeDefined()
			expect(result.current.error?.status).toBe(500)
			expect(result.current.error?.value).toEqual({
				message: "Failed to fetch posts",
			})
			expect(result.current.error?.value).toBeDefined()
		})

		test("error with path params infinite query", async () => {
			const Wrapper = createWrapper(createErrorMockClient())

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
