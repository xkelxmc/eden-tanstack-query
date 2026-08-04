import type { treaty } from "@elysiajs/eden"
import { QueryClient, QueryObserver, skipToken } from "@tanstack/react-query"
import { Elysia, t } from "elysia"
import { createEdenOptionsProxy } from "../../src/proxy/createOptionsProxy"
import { createTestQueryClient } from "../../test-utils"

// ============================================================================
// Test App Definition
// ============================================================================

const app = new Elysia()
	.get("/api/hello", () => "world")
	.get("/api/profile", ({ headers }) => headers.authorization ?? "")
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

		test("keeps response-varying headers in the query key", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.users.get.queryOptions({
				status: "active",
				headers: { Authorization: "Bearer secret" },
			})

			expect(options.queryKey).toEqual([
				["api", "users", "get"],
				{
					input: { status: "active" },
					scope: { headers: { Authorization: "Bearer secret" } },
					type: "query",
				},
			])
			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const rotated = (eden as any).api.users.get.queryOptions({
				status: "active",
				headers: { Authorization: "Bearer other" },
			})
			expect(rotated.queryKey).not.toEqual(options.queryKey)

			const isolatedQueryClient = createTestQueryClient()
			isolatedQueryClient.setQueryData(options.queryKey, [])
			isolatedQueryClient.setQueryData(rotated.queryKey, [])
			expect(
				isolatedQueryClient
					.getQueryCache()
					.findAll(eden.api.users.get.queryFilter({ status: "active" })),
			).toHaveLength(2)
		})

		test("normalizes request-shape headers in the query key", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.users.get.queryOptions({
				query: { status: "active" },
				headers: { Authorization: "Bearer secret" },
			})

			expect(options.queryKey).toEqual([
				["api", "users", "get"],
				{
					input: { status: "active" },
					scope: { headers: { Authorization: "Bearer secret" } },
					type: "query",
				},
			])
		})

		test("queryKey helper matches the key of a query created with headers", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const withHeaders = (eden as any).api.users.get.queryOptions({
				status: "active",
				headers: { Authorization: "Bearer secret" },
			})
			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const helperKey = (eden as any).api.users.get.queryKey({
				status: "active",
				headers: { Authorization: "Bearer secret" },
			})

			expect(helperKey).toEqual(withHeaders.queryKey)
		})

		test("partitions header-dependent data without serializing headers", async () => {
			const requests: string[] = []
			const client = {
				api: {
					profile: {
						get: async (request: { headers?: { Authorization?: string } }) => {
							const authorization = request.headers?.Authorization ?? ""
							requests.push(authorization)
							return { data: authorization, error: null }
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>
			const isolatedQueryClient = new QueryClient({
				defaultOptions: { queries: { retry: false, staleTime: Infinity } },
			})
			const eden = createEdenOptionsProxy<App>({
				client,
				queryClient: isolatedQueryClient,
			})

			const alice = eden.api.profile.get.queryOptions({
				headers: { Authorization: "Bearer alice" },
				cachePartition: "alice",
			})
			const bob = eden.api.profile.get.queryOptions({
				headers: { Authorization: "Bearer bob" },
				cachePartition: "bob",
			})
			const aliceKey = eden.api.profile.get.queryKey({
				headers: { Authorization: "rotated token" },
				cachePartition: "alice",
			})

			expect(JSON.stringify(alice.queryKey)).not.toContain("Bearer alice")
			expect(alice.queryKey).toEqual(aliceKey)
			expect(alice.queryKey).not.toEqual(bob.queryKey)
			expect(await isolatedQueryClient.fetchQuery(alice)).toBe("Bearer alice")
			expect(await isolatedQueryClient.fetchQuery(bob)).toBe("Bearer bob")
			expect(requests).toEqual(["Bearer alice", "Bearer bob"])
		})

		test("normalizes numeric path params in the key", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: same URL, same key
			const numeric = (eden as any).api.users({ id: 123 }).get.queryKey()
			const stringy = eden.api.users({ id: "123" }).get.queryKey()

			expect(numeric).toEqual(stringy)
		})

		test("keeps direction in the infinite key so sort orders stay distinct", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const asc = (eden as any).api.posts.get.infiniteQueryKey({
				limit: 10,
				direction: "asc",
			})
			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const desc = (eden as any).api.posts.get.infiniteQueryKey({
				limit: 10,
				direction: "desc",
			})

			expect(asc).not.toEqual(desc)
			expect(asc[1]).toEqual({
				input: { limit: 10, direction: "asc" },
				type: "infinite",
			})
		})

		test("skipToken key differs from the parameterless route key", () => {
			const eden = createEden()

			const skipped = eden.api.users({ id: "1" }).get.queryOptions(skipToken)
			const list = eden.api.users.get.queryOptions()

			expect(skipped.queryKey).not.toEqual(list.queryKey)
		})

		test("skipToken without path params matches the no-input key", () => {
			const eden = createEden()

			const skipped = eden.api.users.get.queryOptions(skipToken)
			const enabled = eden.api.users.get.queryOptions()

			expect(skipped.queryFn).toBeUndefined()
			expect(skipped.enabled).toBe(false)
			expect(skipped.queryKey).toEqual(enabled.queryKey)
		})

		test("infinite skipToken without path params matches the no-input key", () => {
			const eden = createEden()

			const skipped = eden.api.posts.get.infiniteQueryOptions(skipToken, {
				getNextPageParam: () => undefined,
			})
			const enabled = eden.api.posts.get.infiniteQueryOptions(undefined, {
				getNextPageParam: () => undefined,
			})

			expect(skipped.queryFn).toBeUndefined()
			expect(skipped.enabled).toBe(false)
			expect(skipped.queryKey).toEqual(enabled.queryKey)
		})

		test("skipToken observer does not replace an enabled query function", async () => {
			let requestCount = 0
			const client = {
				api: {
					users: {
						get: async () => {
							requestCount++
							return { data: requestCount, error: null }
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>
			const isolatedQueryClient = createTestQueryClient()
			const eden = createEdenOptionsProxy<App>({
				client,
				queryClient: isolatedQueryClient,
			})
			const enabledOptions = eden.api.users.get.queryOptions()
			const skippedOptions = eden.api.users.get.queryOptions(skipToken)
			const enabledObserver = new QueryObserver(
				isolatedQueryClient,
				enabledOptions,
			)
			const unsubscribeEnabled = enabledObserver.subscribe(() => {})

			await enabledObserver.refetch()
			const skippedObserver = new QueryObserver(
				isolatedQueryClient,
				skippedOptions,
			)
			const unsubscribeSkipped = skippedObserver.subscribe(() => {})

			await isolatedQueryClient.invalidateQueries({
				queryKey: enabledOptions.queryKey,
			})

			expect(requestCount).toBe(2)
			unsubscribeSkipped()
			unsubscribeEnabled()
			isolatedQueryClient.clear()
		})

		test("Date values survive key building alongside path params", () => {
			const eden = createEden()
			const january = new Date("2026-01-01T00:00:00Z")
			const february = new Date("2026-02-01T00:00:00Z")

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const janKey = (eden as any).api
				.users({ id: "1" })
				.get.queryKey({ from: january })
			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const febKey = (eden as any).api
				.users({ id: "1" })
				.get.queryKey({ from: february })

			expect(janKey[1]).toEqual({
				input: { id: "1", from: january },
				type: "query",
			})
			expect(janKey).not.toEqual(febKey)
		})

		test("Date values survive key building alongside headers", () => {
			const eden = createEden()
			const from = new Date("2026-01-01T00:00:00Z")

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const key = (eden as any).api.users.get.queryKey({
				from,
				headers: { Authorization: "Bearer secret" },
			})

			expect(key[1]).toEqual({
				input: { from },
				scope: { headers: { Authorization: "Bearer secret" } },
				type: "query",
			})
		})

		test("headers-only input has its own key", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const withHeaders = (eden as any).api.users.get.queryOptions({
				headers: { Authorization: "Bearer secret" },
			})
			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const withHeadersFilter = (eden as any).api.users.get.queryFilter({
				headers: { Authorization: "Bearer secret" },
			})
			const plain = eden.api.users.get.queryOptions()

			expect(withHeaders.queryKey).not.toEqual(plain.queryKey)
			expect(withHeadersFilter.queryKey[1]).toEqual({
				scope: { headers: { Authorization: "Bearer secret" } },
			})
		})

		test("infinite keys normalize headers in both accepted shapes", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const direct = (eden as any).api.posts.get.infiniteQueryKey({
				limit: 10,
				headers: { Authorization: "Bearer secret" },
			})
			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const wrapped = (eden as any).api.posts.get.infiniteQueryKey({
				query: { limit: 10 },
				headers: { Authorization: "Bearer secret" },
			})
			const plain = eden.api.posts.get.infiniteQueryKey({ limit: 10 })

			expect(direct).toEqual(wrapped)
			expect(direct).not.toEqual(plain)
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

		test("queryOptions supports top-level headers and forwards them separately", async () => {
			let capturedRequest: unknown

			const clientWithCapture = {
				api: {
					users: {
						get: async (opts?: unknown) => {
							capturedRequest = opts
							return { data: [], error: null }
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: clientWithCapture,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.users.get.queryOptions({
				status: "from-top-level",
				headers: { "X-Tenant": "acme" },
			})

			await queryClient.fetchQuery(options)

			const request = capturedRequest as Record<string, unknown>
			expect(request.query).toEqual({ status: "from-top-level" })
			expect(request.headers).toEqual({ "X-Tenant": "acme" })
		})

		test("queryOptions supports request shape input with query + headers", async () => {
			let capturedRequest: unknown

			const clientWithCapture = {
				api: {
					users: {
						get: async (opts?: unknown) => {
							capturedRequest = opts
							return { data: [], error: null }
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: clientWithCapture,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.users.get.queryOptions({
				query: { status: "from-request-shape" },
				headers: { "X-Tenant": "acme" },
			})

			await queryClient.fetchQuery(options)

			const request = capturedRequest as Record<string, unknown>
			expect(request.query).toEqual({ status: "from-request-shape" })
			expect(request.headers).toEqual({ "X-Tenant": "acme" })
		})

		test("queryOptions keeps a lone query key as query input", async () => {
			let capturedRequest: unknown

			const clientWithCapture = {
				api: {
					users: {
						get: async (opts?: unknown) => {
							capturedRequest = opts
							return { data: [], error: null }
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: clientWithCapture,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.users.get.queryOptions({
				query: "hello",
			})

			await queryClient.fetchQuery(options)

			const request = capturedRequest as Record<string, unknown>
			expect(request.query).toEqual({ query: "hello" })
			expect("headers" in request).toBe(false)
		})

		test("queryOptions supports request shape input with undefined headers", async () => {
			let capturedRequest: unknown

			const clientWithCapture = {
				api: {
					users: {
						get: async (opts?: unknown) => {
							capturedRequest = opts
							return { data: [], error: null }
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: clientWithCapture,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.users.get.queryOptions({
				query: { role: "admin-with-undefined-headers" },
				headers: undefined,
			})

			await queryClient.fetchQuery(options)

			const request = capturedRequest as Record<string, unknown>
			expect(request.query).toEqual({ role: "admin-with-undefined-headers" })
			expect("headers" in request).toBe(false)
		})

		test("queryOptions preserves extra top-level fields when input contains query key", async () => {
			let capturedRequest: unknown

			const clientWithCapture = {
				api: {
					users: {
						get: async (opts?: unknown) => {
							capturedRequest = opts
							return { data: [], error: null }
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: clientWithCapture,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.users.get.queryOptions({
				query: "foo",
				page: 1,
			})

			await queryClient.fetchQuery(options)

			const request = capturedRequest as Record<string, unknown>
			expect(request.query).toEqual({ query: "foo", page: 1 })
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
			// pathParams should be included in queryKey metadata
			expect(options.queryKey[1]).toEqual({
				input: { id: "123" },
				type: "query",
			})
		})

		test("queryKey includes pathParams for cache differentiation", () => {
			const eden = createEden()

			// /api/users (list) vs /api/users/:id (single)
			const listKey = eden.api.users.get.queryKey()
			const singleKey = eden.api.users({ id: "123" }).get.queryKey()

			// Keys should be different
			expect(listKey).not.toEqual(singleKey)

			// List has no input
			expect(listKey).toEqual([["api", "users", "get"], { type: "query" }])

			// Single has id in input
			expect(singleKey).toEqual([
				["api", "users", "get"],
				{ input: { id: "123" }, type: "query" },
			])
		})

		test("queryKey with pathParams and additional input", () => {
			const eden = createEden()

			// Path: /api/users/:id with additional query params
			const key = eden.api
				.users({ id: "123" })
				.get.queryKey({ status: "active" })

			// Should merge pathParams and input
			expect(key).toEqual([
				["api", "users", "get"],
				{ input: { id: "123", status: "active" }, type: "query" },
			])
		})

		test("queryFilter includes pathParams", () => {
			const eden = createEden()

			const filter = eden.api.users({ id: "123" }).get.queryFilter()

			// type: "any" is omitted by getQueryKey when type is "any"
			expect(filter.queryKey[1]).toEqual({
				input: { id: "123" },
			})
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

		test("path params applied at correct position after multiple static segments", async () => {
			// Verifies path params being applied at the correct position
			// Path: /api/v1/users/address/:userId
			let capturedParams: Record<string, unknown> | null = null

			const mockClient = {
				api: {
					v1: {
						users: {
							address: (params: { userId: string }) => {
								capturedParams = params
								return {
									get: async () => ({
										data: { userId: params.userId, address: "123 Main St" },
										error: null,
									}),
								}
							},
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: mockClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing custom route structure
			const options = (eden as any).api.v1.users
				.address({ userId: "456" })
				.get.queryOptions({})

			const result = await queryClient.fetchQuery(options)

			expect(capturedParams).toEqual({ userId: "456" })
			expect(result).toEqual({ userId: "456", address: "123 Main St" })
		})

		test("queryOptions preserves skipToken when path params are present", () => {
			const eden = createEden()
			const options = eden.api.users({ id: "123" }).get.queryOptions(skipToken)

			expect(options.queryFn).toBeUndefined()
			expect(options.enabled).toBe(false)
			// The key keeps its identity: same as the enabled query for id 123,
			// never colliding with the parameterless route key.
			expect(options.queryKey).toEqual([
				["api", "users", "get"],
				{ input: { id: "123" }, type: "query" },
			])
			expect(options.queryKey).toEqual(
				eden.api.users({ id: "123" }).get.queryOptions().queryKey,
			)
		})

		test("multiple path params at different positions work correctly", async () => {
			// Path: /api/v1/orgs/:orgId/teams/:teamId/members
			const capturedOrgId: string[] = []
			const capturedTeamId: string[] = []

			const mockClient = {
				api: {
					v1: {
						orgs: (params: { orgId: string }) => {
							capturedOrgId.push(params.orgId)
							return {
								teams: (teamParams: { teamId: string }) => {
									capturedTeamId.push(teamParams.teamId)
									return {
										members: {
											get: async () => ({
												data: [
													{
														id: "member1",
														orgId: params.orgId,
														teamId: teamParams.teamId,
													},
												],
												error: null,
											}),
										},
									}
								},
							}
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: mockClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing custom route structure
			const options = (eden as any).api.v1
				.orgs({ orgId: "org-123" })
				.teams({ teamId: "team-456" })
				.members.get.queryOptions({})

			const result = await queryClient.fetchQuery(options)

			expect(capturedOrgId).toContain("org-123")
			expect(capturedTeamId).toContain("team-456")
			expect(result).toEqual([
				{ id: "member1", orgId: "org-123", teamId: "team-456" },
			])
		})

		test("path param at first segment works correctly", async () => {
			// Path: /tenants/:tenantId/users
			const mockClient = {
				tenants: (params: { tenantId: string }) => ({
					users: {
						get: async () => ({
							data: [{ id: "u1", tenantId: params.tenantId }],
							error: null,
						}),
					},
				}),
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: mockClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing custom route structure
			const options = (eden as any)
				.tenants({ tenantId: "t-1" })
				.users.get.queryOptions({})

			const result = await queryClient.fetchQuery(options)
			expect(result).toEqual([{ id: "u1", tenantId: "t-1" }])
		})

		test("mutation with deep path params applies params correctly", async () => {
			// Path: /api/v1/orgs/:orgId/settings (POST)
			let capturedParams: Record<string, unknown> | null = null

			const mockClient = {
				api: {
					v1: {
						orgs: (params: { orgId: string }) => {
							capturedParams = params
							return {
								settings: {
									post: async (body: unknown) => ({
										data: { orgId: params.orgId, ...(body as object) },
										error: null,
									}),
								},
							}
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: mockClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing custom route structure
			const options = (eden as any).api.v1
				.orgs({ orgId: "org-99" })
				.settings.post.mutationOptions()

			const result = await options.mutationFn({ name: "New Settings" })

			expect(capturedParams).toEqual({ orgId: "org-99" })
			expect(result).toEqual({ orgId: "org-99", name: "New Settings" })
		})

		test("different path param values produce different cache keys", () => {
			const mockClient = {
				api: {
					v1: {
						users: {
							address: () => ({
								get: async () => ({ data: null, error: null }),
							}),
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: mockClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing custom route structure
			const proxy = eden as any
			const key1 = proxy.api.v1.users.address({ userId: "aaa" }).get.queryKey()
			const key2 = proxy.api.v1.users.address({ userId: "bbb" }).get.queryKey()

			expect(key1).not.toEqual(key2)
			expect(key1[1]).toEqual({ input: { userId: "aaa" }, type: "query" })
			expect(key2[1]).toEqual({ input: { userId: "bbb" }, type: "query" })
		})

		test("multiple path params merge into queryKey correctly", () => {
			const mockClient = {
				api: {
					orgs: () => ({
						teams: () => ({
							members: {
								get: async () => ({ data: [], error: null }),
							},
						}),
					}),
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: mockClient,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing custom route structure
			const key = (eden as any).api
				.orgs({ orgId: "o1" })
				.teams({ teamId: "t2" })
				.members.get.queryKey({ role: "admin" })

			expect(key[1]).toEqual({
				input: { orgId: "o1", teamId: "t2", role: "admin" },
				type: "query",
			})
		})

		test("infiniteQueryOptions preserves skipToken when path params are present", () => {
			const mockClient = {
				api: {
					comments: (_params: { postId: string }) => ({
						get: async () => ({
							data: { items: [], nextCursor: null },
							error: null,
						}),
					}),
				},
			}

			const eden = createEdenOptionsProxy<any>({
				client: mockClient as any,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Testing custom route structure
			const options = (eden as any).api
				.comments({ postId: "42" })
				.get.infiniteQueryOptions(skipToken, {
					getNextPageParam: () => undefined,
				})

			expect(options.queryFn).toBeUndefined()
			expect(options.enabled).toBe(false)
			// Path params stay in the key even when fetching is skipped.
			expect(options.queryKey).toEqual([
				["api", "comments", "get"],
				{ input: { postId: "42" }, type: "infinite" },
			])
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

		test("infiniteQueryOptions wraps array input when adding a cursor", async () => {
			let capturedRequest: unknown

			const clientWithCapture = {
				api: {
					posts: {
						get: async (opts?: unknown) => {
							capturedRequest = opts
							return {
								data: { items: [], nextCursor: null },
								error: null,
							}
						},
					},
				},
			} as unknown as ReturnType<typeof treaty<App>>

			const eden = createEdenOptionsProxy<App>({
				client: clientWithCapture,
				queryClient,
			})

			// biome-ignore lint/suspicious/noExplicitAny: Runtime behavior validation
			const options = (eden as any).api.posts.get.infiniteQueryOptions(
				["a", "b"],
				{
					getNextPageParam: () => undefined,
					initialCursor: "cursor-1",
				},
			)

			await queryClient.fetchInfiniteQuery(options)

			const request = capturedRequest as Record<string, unknown>
			expect(request.query).toEqual({
				cursor: "cursor-1",
				query: ["a", "b"],
			})
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
