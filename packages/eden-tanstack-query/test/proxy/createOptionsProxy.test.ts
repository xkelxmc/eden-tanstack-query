import type { treaty } from "@elysiajs/eden"
import { Elysia, t } from "elysia"
import { createEdenOptionsProxy } from "../../src/proxy/createOptionsProxy"
import { createTestQueryClient } from "../../test-utils"

// ============================================================================
// Test App Definition
// ============================================================================

const app = new Elysia()
	.get("/api/hello", () => "world")
	.get(
		"/api/users",
		({ query }) => {
			return [{ id: "1", name: "John", status: query.status ?? "active" }]
		},
		{
			query: t.Object({
				status: t.Optional(t.String()),
				search: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/api/users",
		({ body }) => {
			return { id: "1", ...body }
		},
		{
			body: t.Object({
				name: t.String(),
			}),
		},
	)
	.get(
		"/api/users/:id",
		({ params }) => {
			return { id: params.id, name: "User" }
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.put(
		"/api/users/:id",
		({ params, body }) => {
			return { id: params.id, ...body }
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ name: t.String() }),
		},
	)
	.delete(
		"/api/users/:id",
		({ params }) => {
			return { success: true, id: params.id }
		},
		{
			params: t.Object({ id: t.String() }),
		},
	)
	.get(
		"/api/users/:id/posts",
		({ params }) => {
			return [{ id: "post1", userId: params.id }]
		},
		{
			params: t.Object({ id: t.String() }),
		},
	)
	.get(
		"/api/posts",
		({ query }) => {
			return {
				items: [{ id: "1", title: "Post 1" }],
				nextCursor: query.cursor ? "cursor3" : "cursor2",
			}
		},
		{
			query: t.Object({
				limit: t.Optional(t.Number()),
				cursor: t.Optional(t.String()),
			}),
		},
	)

type App = typeof app

// ============================================================================
// Test Setup
// ============================================================================

describe("createEdenOptionsProxy", () => {
	const queryClient = createTestQueryClient()

	// Create typed Eden client (mock - doesn't make real requests)
	// We use the app type but create a mock implementation
	function createMockTreatyClient() {
		const usersById: Record<string, unknown> = {}

		const mockClient = {
			api: {
				hello: {
					get: async () => ({ data: "world", error: null }),
				},
				users: Object.assign(
					(params: { id: string }) => {
						if (!usersById[params.id]) {
							usersById[params.id] = {
								get: async () => ({
									data: { id: params.id, name: "User" },
									error: null,
								}),
								put: async (body: unknown) => ({
									data: { id: params.id, ...(body as object) },
									error: null,
								}),
								delete: async () => ({
									data: { success: true, id: params.id },
									error: null,
								}),
								posts: {
									get: async () => ({
										data: [{ id: "post1", userId: params.id }],
										error: null,
									}),
								},
							}
						}
						return usersById[params.id]
					},
					{
						get: async (opts?: {
							query?: { status?: string; search?: string }
						}) => ({
							data: [
								{
									id: "1",
									name: "John",
									status: opts?.query?.status ?? "active",
								},
							],
							error: null,
						}),
						post: async (body: { name: string }) => ({
							data: { id: "1", ...body },
							error: null,
						}),
					},
				),
				posts: {
					get: async (opts?: {
						query?: { limit?: number; cursor?: string }
					}) => ({
						data: {
							items: [{ id: "1", title: "Post 1" }],
							nextCursor: opts?.query?.cursor ? "cursor3" : "cursor2",
						},
						error: null,
					}),
				},
			},
		}

		// Cast to Treaty.Create<App> for type compatibility
		return mockClient as unknown as ReturnType<typeof treaty<App>>
	}

	function createEden() {
		const client = createMockTreatyClient()
		return createEdenOptionsProxy<App>({ client, queryClient })
	}

	describe("path building", () => {
		test("builds correct path for simple routes", () => {
			const eden = createEden()

			const options = eden.api.hello.get.queryOptions({})

			expect(options.eden.path).toBe("api.hello.get")
			expect(options.queryKey[0]).toEqual(["api", "hello", "get"])
		})

		test("builds correct path for nested routes", () => {
			const eden = createEden()

			const options = eden.api.users.get.queryOptions({})

			expect(options.eden.path).toBe("api.users.get")
			expect(options.queryKey[0]).toEqual(["api", "users", "get"])
		})
	})

	describe("query key generation", () => {
		test("generates query key without input", () => {
			const eden = createEden()

			const key = eden.api.hello.get.queryKey()

			expect(key[0]).toEqual(["api", "hello", "get"])
			expect(key[1]).toEqual({ type: "query" })
		})

		test("generates query key with input", () => {
			const eden = createEden()

			const key = eden.api.users.get.queryKey({ search: "test" })

			expect(key[0]).toEqual(["api", "users", "get"])
			expect(key[1]).toEqual({ input: { search: "test" }, type: "query" })
		})

		test("generates infinite query key", () => {
			const eden = createEden()

			const key = eden.api.posts.get.infiniteQueryKey({ limit: 10 })

			expect(key[0]).toEqual(["api", "posts", "get"])
			expect(key[1]).toEqual({ input: { limit: 10 }, type: "infinite" })
		})
	})

	describe("mutation key generation", () => {
		test("generates mutation key", () => {
			const eden = createEden()

			const key = eden.api.users.post.mutationKey()

			expect(key).toEqual([["api", "users", "post"]])
		})
	})

	describe("query filter generation", () => {
		test("generates query filter without input", () => {
			const eden = createEden()

			const filter = eden.api.users.get.queryFilter()

			expect(filter.queryKey[0]).toEqual(["api", "users", "get"])
		})

		test("generates query filter with input and additional filters", () => {
			const eden = createEden()

			const filter = eden.api.users.get.queryFilter(
				{ search: "test" },
				{ stale: true },
			)

			expect(filter.queryKey[0]).toEqual(["api", "users", "get"])
			expect(filter.stale).toBe(true)
		})
	})

	describe("query options", () => {
		test("GET method returns queryOptions", () => {
			const eden = createEden()

			const procedure = eden.api.hello.get

			expect(typeof procedure.queryOptions).toBe("function")
			expect(typeof procedure.queryKey).toBe("function")
			expect(typeof procedure.queryFilter).toBe("function")
			expect(typeof procedure.infiniteQueryOptions).toBe("function")
		})

		test("queryOptions creates valid options", () => {
			const eden = createEden()

			const options = eden.api.users.get.queryOptions({ status: "active" })

			expect(options.queryKey[0]).toEqual(["api", "users", "get"])
			expect(options.queryKey[1]).toEqual({
				input: { status: "active" },
				type: "query",
			})
			expect(typeof options.queryFn).toBe("function")
			expect(options.eden.path).toBe("api.users.get")
		})

		test("queryOptions passes through additional options", () => {
			const eden = createEden()

			const options = eden.api.users.get.queryOptions(
				{},
				{
					staleTime: 5000,
					refetchOnWindowFocus: false,
				},
			)

			expect(options.staleTime).toBe(5000)
			expect(options.refetchOnWindowFocus).toBe(false)
		})
	})

	describe("mutation options", () => {
		test("POST method returns mutationOptions", () => {
			const eden = createEden()

			const procedure = eden.api.users.post

			expect(typeof procedure.mutationOptions).toBe("function")
			expect(typeof procedure.mutationKey).toBe("function")
		})

		test("mutationOptions creates valid options", () => {
			const eden = createEden()

			const options = eden.api.users.post.mutationOptions()

			expect(options.mutationKey).toEqual([["api", "users", "post"]])
			expect(typeof options.mutationFn).toBe("function")
			expect(options.eden.path).toBe("api.users.post")
		})

		test("mutationOptions passes through additional options", () => {
			const eden = createEden()

			const onSuccess = () => {}
			const options = eden.api.users.post.mutationOptions({
				onSuccess,
			})

			expect(options.onSuccess).toBe(onSuccess)
		})
	})

	describe("HTTP method routing", () => {
		test("GET creates query procedure", () => {
			const eden = createEden()

			const procedure = eden.api.users.get

			expect(typeof procedure.queryOptions).toBe("function")
			expect(typeof procedure.queryKey).toBe("function")
			expect(typeof procedure.queryFilter).toBe("function")
			// biome-ignore lint/suspicious/noExplicitAny: Testing runtime property absence
			expect((procedure as any).mutationOptions).toBeUndefined()
		})

		test("GET with cursor creates query + infinite query procedure", () => {
			const eden = createEden()

			// posts route has cursor in query params
			const procedure = eden.api.posts.get

			// Regular query methods
			expect(typeof procedure.queryOptions).toBe("function")
			expect(typeof procedure.queryKey).toBe("function")

			// Infinite query methods (available because input has cursor)
			expect(typeof procedure.infiniteQueryOptions).toBe("function")
			expect(typeof procedure.infiniteQueryKey).toBe("function")
			expect(typeof procedure.infiniteQueryFilter).toBe("function")
		})

		test("POST creates mutation procedure", () => {
			const eden = createEden()

			const procedure = eden.api.users.post

			expect(typeof procedure.mutationOptions).toBe("function")
			expect(typeof procedure.mutationKey).toBe("function")
			// biome-ignore lint/suspicious/noExplicitAny: Testing runtime property absence
			expect((procedure as any).queryOptions).toBeUndefined()
		})
	})

	describe("data fetching", () => {
		test("fetches data via queryOptions", async () => {
			const eden = createEden()

			const options = eden.api.hello.get.queryOptions({})
			const result = await queryClient.fetchQuery(options)

			expect(result).toBe("world")
		})

		test("fetches data with query params", async () => {
			const eden = createEden()

			const options = eden.api.users.get.queryOptions({ search: "test" })
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual([{ id: "1", name: "John", status: "active" }])
		})

		test("mutates data via mutationOptions", async () => {
			const eden = createEden()

			const options = eden.api.users.post.mutationOptions()
			const result = await options.mutationFn({ name: "Jane" })

			expect(result).toEqual({ id: "1", name: "Jane" })
		})
	})

	describe("path parameters", () => {
		test("handles path params via function call", () => {
			const eden = createEden()

			// Path: /api/users/:id
			const options = eden.api.users({ id: "123" }).get.queryOptions({})

			expect(options.eden.path).toBe("api.users.get")
			expect(options.queryKey[0]).toEqual(["api", "users", "get"])
		})

		test("fetches data with path params", async () => {
			const eden = createEden()

			const options = eden.api.users({ id: "123" }).get.queryOptions({})
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual({ id: "123", name: "User" })
		})

		test("handles nested path params", async () => {
			const eden = createEden()

			// Path: /api/users/:id/posts
			const options = eden.api.users({ id: "123" }).posts.get.queryOptions({})
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual([{ id: "post1", userId: "123" }])
		})

		test("mutations work with path params", async () => {
			const eden = createEden()

			const options = eden.api.users({ id: "123" }).put.mutationOptions()
			const result = await options.mutationFn({ name: "Updated" })

			expect(result).toEqual({ id: "123", name: "Updated" })
		})

		test("DELETE works with path params", async () => {
			const eden = createEden()

			const options = eden.api.users({ id: "123" }).delete.mutationOptions()
			const result = await options.mutationFn(undefined)

			expect(result).toEqual({ success: true, id: "123" })
		})
	})

	describe("infinite query options", () => {
		test("creates infinite query options", () => {
			const eden = createEden()

			const options = eden.api.posts.get.infiniteQueryOptions(
				{ limit: 10 },
				{
					getNextPageParam: (lastPage) => lastPage.nextCursor,
				},
			)

			expect(options.queryKey[0]).toEqual(["api", "posts", "get"])
			expect(options.eden.path).toBe("api.posts.get")
			expect(typeof options.queryFn).toBe("function")
		})

		test("infiniteQueryFilter generates correct filter", () => {
			const eden = createEden()

			const filter = eden.api.posts.get.infiniteQueryFilter({ limit: 10 })

			expect(filter.queryKey[0]).toEqual(["api", "posts", "get"])
			expect(filter.queryKey[1]).toEqual({
				input: { limit: 10 },
				type: "infinite",
			})
		})
	})

	describe("error handling", () => {
		test("throws error from Eden response", async () => {
			// Create a special mock client that returns errors
			const errorClient = {
				api: {
					error: {
						get: async () => ({
							data: null,
							error: { status: 500, message: "Server Error" },
						}),
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: errorClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing non-existent route
			const options = (eden as any).api.error.get.queryOptions()

			await expect(queryClient.fetchQuery(options)).rejects.toEqual({
				status: 500,
				message: "Server Error",
			})
		})

		test("throws error from mutation", async () => {
			const errorClient = {
				api: {
					error: {
						post: async () => ({
							data: null,
							error: { status: 400, message: "Bad Request" },
						}),
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: errorClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing non-existent route
			const options = (eden as any).api.error.post.mutationOptions()

			await expect(options.mutationFn({})).rejects.toEqual({
				status: 400,
				message: "Bad Request",
			})
		})

		test("throws error when navigating to non-existent path", async () => {
			const limitedClient = {
				api: {
					users: {
						get: async () => ({ data: [], error: null }),
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: limitedClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing non-existent path at runtime
			const options = (eden as any).api.nonexistent.get.queryOptions()

			await expect(queryClient.fetchQuery(options)).rejects.toThrow(
				"Invalid path: segment 'nonexistent' does not exist on client",
			)
		})

		test("throws error when path segment is null", async () => {
			const nullClient = {
				api: {
					users: null,
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: nullClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing null path segment
			const options = (eden as any).api.users.get.queryOptions()

			// Error occurs when trying to access method on null
			await expect(queryClient.fetchQuery(options)).rejects.toThrow()
		})
	})

	describe("edge cases", () => {
		test("works without queryClient option", () => {
			const client = createMockTreatyClient()
			const eden = createEdenOptionsProxy<App>({ client })

			const options = eden.api.hello.get.queryOptions({})

			expect(options.queryKey[0]).toEqual(["api", "hello", "get"])
		})

		test("handles empty input object", () => {
			const eden = createEden()

			const key = eden.api.users.get.queryKey({})

			expect(key[0]).toEqual(["api", "users", "get"])
			expect(key[1]).toEqual({ input: {}, type: "query" })
		})
	})
})
