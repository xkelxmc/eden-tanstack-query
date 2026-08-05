import { treaty } from "@elysiajs/eden"
import type { QueryKey } from "@tanstack/react-query"
import { QueryClient, QueryObserver, skipToken } from "@tanstack/react-query"
import { Elysia, t } from "elysia"
import type { EdenQueryKey } from "../../src/keys/types"
import { edenInfiniteQueryOptions } from "../../src/options/infiniteQueryOptions"
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

const compositeCursorApp = new Elysia().get(
	"/cursor",
	() => ({ value: "ok" }),
	{
		query: t.Object({
			cursor: t.Optional(
				t.Union([
					t.Object({
						offset: t.Number(),
						shard: t.Optional(t.String()),
					}),
					t.Array(t.Number()),
					t.Date(),
					t.BigInt(),
					t.Null(),
				]),
			),
			scope: t.Optional(
				t.Object({
					tenant: t.String(),
					region: t.Optional(t.String()),
				}),
			),
		}),
	},
)

function isKeyRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getInfiniteKeyMeta(queryKey: QueryKey) {
	const meta = queryKey[1]
	if (!isKeyRecord(meta)) return

	const infinite = meta.infinite
	if (!isKeyRecord(infinite)) return
	return infinite
}

const compositeCursorInput = {
	scope: { tenant: "tenant-a", region: "west" },
}

function createCompositeEden(queryClient: QueryClient) {
	return createEdenOptionsProxy<typeof compositeCursorApp>({
		client: treaty(compositeCursorApp),
		queryClient,
	})
}

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
			expect(key[1]).toEqual({
				input: { limit: 10 },
				type: "infinite",
				infinite: { initialPageParam: null },
			})
		})

		test("manual infinite keys match options and filters match all cursors", () => {
			const eden = createEden()
			const isolatedQueryClient = createTestQueryClient()
			const input = { limit: 10 }
			const nullableOptions = eden.api.posts.get.infiniteQueryOptions(input, {
				getNextPageParam: (page) => page.nextCursor,
			})
			const explicitOptions = eden.api.posts.get.infiniteQueryOptions(input, {
				initialCursor: "start",
				getNextPageParam: (page) => page.nextCursor,
			})
			const nullOptions = eden.api.posts.get.infiniteQueryOptions(input, {
				initialCursor: null,
				getNextPageParam: (page) => page.nextCursor,
			})
			const undefinedOptions = eden.api.posts.get.infiniteQueryOptions(input, {
				initialCursor: undefined,
				getNextPageParam: (page) => page.nextCursor,
			})
			const nullableKey = eden.api.posts.get.infiniteQueryKey(input)
			const nullKey = eden.api.posts.get.infiniteQueryKey(input, {
				initialCursor: null,
			})
			const undefinedKey = eden.api.posts.get.infiniteQueryKey(input, {
				initialCursor: undefined,
			})
			const explicitKey = eden.api.posts.get.infiniteQueryKey(input, {
				initialCursor: "start",
			})

			expect(nullableKey).toEqual(nullableOptions.queryKey)
			expect(nullKey).toEqual(nullableOptions.queryKey)
			expect(undefinedKey).toEqual(nullableOptions.queryKey)
			expect(nullOptions.queryKey).toEqual(nullableOptions.queryKey)
			expect(undefinedOptions.queryKey).toEqual(nullableOptions.queryKey)
			expect(explicitKey).toEqual(explicitOptions.queryKey)
			expect(nullableKey).not.toEqual(explicitKey)

			isolatedQueryClient.setQueryData(nullableKey, {
				pages: [{ items: [], nextCursor: "done" }],
				pageParams: [null],
			})
			isolatedQueryClient.setQueryData(explicitKey, {
				pages: [{ items: [], nextCursor: "done" }],
				pageParams: ["start"],
			})

			const matches = isolatedQueryClient
				.getQueryCache()
				.findAll(eden.api.posts.get.infiniteQueryFilter(input))
			expect(matches).toHaveLength(2)
			expect(
				isolatedQueryClient
					.getQueryCache()
					.findAll(
						eden.api.posts.get.infiniteQueryFilter(input, { exact: true }),
					),
			).toHaveLength(1)
			expect(
				isolatedQueryClient.getQueryCache().findAll(
					eden.api.posts.get.infiniteQueryFilter(input, {
						initialCursor: "start",
					}),
				),
			).toHaveLength(1)
			expect(
				isolatedQueryClient.getQueryCache().findAll(
					eden.api.posts.get.infiniteQueryFilter(input, {
						initialCursor: undefined,
					}),
				),
			).toHaveLength(1)
		})

		test("cursor filters compare composite cursors atomically", () => {
			const isolatedQueryClient = createTestQueryClient()
			const eden = createCompositeEden(isolatedQueryClient)
			const objectCursor = { offset: 1, shard: "a" }
			const arrayCursor = [1, 2]
			const dateCursor = new Date("2026-01-01T00:00:00.000Z")

			const objectKey = eden.cursor.get.infiniteQueryKey(compositeCursorInput, {
				initialCursor: objectCursor,
			})
			const arrayKey = eden.cursor.get.infiniteQueryKey(compositeCursorInput, {
				initialCursor: arrayCursor,
			})
			const dateKey = eden.cursor.get.infiniteQueryKey(compositeCursorInput, {
				initialCursor: dateCursor,
			})
			const nullKey = eden.cursor.get.infiniteQueryKey(compositeCursorInput)

			isolatedQueryClient.setQueryData(objectKey, {
				pages: [{ value: "object" }],
				pageParams: [objectCursor],
			})
			isolatedQueryClient.setQueryData(arrayKey, {
				pages: [{ value: "array" }],
				pageParams: [arrayCursor],
			})
			isolatedQueryClient.setQueryData(dateKey, {
				pages: [{ value: "date" }],
				pageParams: [dateCursor],
			})
			isolatedQueryClient.setQueryData(nullKey, {
				pages: [{ value: "null" }],
				pageParams: [null],
			})

			const partialInput = { scope: { tenant: "tenant-a" } }
			const find = (
				initialCursor:
					| { offset: number; shard?: string }
					| number[]
					| Date
					| null,
			) =>
				isolatedQueryClient.getQueryCache().findAll(
					eden.cursor.get.infiniteQueryFilter(partialInput, {
						initialCursor,
					}),
				)

			expect(find({ offset: 1 })).toHaveLength(0)
			expect(find(objectCursor)).toHaveLength(1)
			expect(find([1])).toHaveLength(0)
			expect(find(arrayCursor)).toHaveLength(1)
			expect(find(new Date("2027-01-01T00:00:00.000Z"))).toHaveLength(0)
			expect(find(dateCursor)).toHaveLength(1)
			expect(find(null)).toHaveLength(1)
			expect(
				isolatedQueryClient
					.getQueryCache()
					.findAll(eden.cursor.get.infiniteQueryFilter(partialInput)),
			).toHaveLength(4)
			expect(
				isolatedQueryClient.getQueryCache().findAll(
					eden.cursor.get.infiniteQueryFilter(compositeCursorInput, {
						exact: true,
					}),
				),
			).toHaveLength(1)

			const callerPredicate = vi.fn(() => false)
			expect(
				isolatedQueryClient.getQueryCache().findAll(
					eden.cursor.get.infiniteQueryFilter(partialInput, {
						initialCursor: objectCursor,
						predicate: callerPredicate,
					}),
				),
			).toHaveLength(0)
			expect(callerPredicate).toHaveBeenCalledTimes(1)
		})

		test("cursor filters distinguish null from undefined and omitted metadata", () => {
			const isolatedQueryClient = createTestQueryClient()
			const eden = createCompositeEden(isolatedQueryClient)
			const undefinedOptions = edenInfiniteQueryOptions({
				path: ["cursor", "get"],
				input: compositeCursorInput,
				initialPageParam: undefined,
				fetch: async () => ({ value: "undefined" }),
				opts: { getNextPageParam: () => undefined },
			})
			const nullKey = eden.cursor.get.infiniteQueryKey(compositeCursorInput)

			isolatedQueryClient.setQueryData(undefinedOptions.queryKey, {
				pages: [],
				pageParams: [],
			})
			isolatedQueryClient.setQueryData(nullKey, { pages: [], pageParams: [] })

			const nullFilter = eden.cursor.get.infiniteQueryFilter(
				compositeCursorInput,
				{
					initialCursor: null,
				},
			)
			const nullMatches = isolatedQueryClient
				.getQueryCache()
				.findAll(nullFilter)
			expect(nullMatches).toHaveLength(1)
			expect(nullMatches[0]?.queryKey).toEqual(nullKey)
			const undefinedInfinite = getInfiniteKeyMeta(undefinedOptions.queryKey)
			expect(Object.hasOwn(undefinedInfinite ?? {}, "initialPageParam")).toBe(
				true,
			)
			expect(undefinedInfinite?.initialPageParam).toBe(undefined)

			const hydratedQueryClient = createTestQueryClient()
			const hydratedKey: EdenQueryKey = [
				["cursor", "get"],
				{ input: compositeCursorInput, type: "infinite", infinite: {} },
			]
			hydratedQueryClient.setQueryData(hydratedKey, {
				pages: [],
				pageParams: [],
			})

			expect(
				hydratedQueryClient.getQueryCache().findAll(nullFilter),
			).toHaveLength(0)
			expect(
				Object.hasOwn(
					getInfiniteKeyMeta(hydratedKey) ?? {},
					"initialPageParam",
				),
			).toBe(false)
		})

		test("cursor filters use each query's custom key hash", () => {
			const cursorAgnosticHash = (queryKey: QueryKey) =>
				JSON.stringify(queryKey, (key, value) =>
					key === "initialPageParam" ? undefined : value,
				) ?? ""
			const cursorAgnosticClient = new QueryClient({
				defaultOptions: {
					queries: { queryKeyHashFn: cursorAgnosticHash, retry: false },
				},
			})
			const cursorAgnosticEden = createCompositeEden(cursorAgnosticClient)
			const objectCursor = { offset: 1, shard: "a" }
			const objectKey = cursorAgnosticEden.cursor.get.infiniteQueryKey(
				compositeCursorInput,
				{ initialCursor: objectCursor },
			)
			const originalInfinite = getInfiniteKeyMeta(objectKey)
			cursorAgnosticClient.setQueryData(objectKey, {
				pages: [],
				pageParams: [],
			})

			const ignoredCursorFilter =
				cursorAgnosticEden.cursor.get.infiniteQueryFilter(
					compositeCursorInput,
					{ initialCursor: { offset: 2 } },
				)
			expect(
				cursorAgnosticClient.getQueryCache().findAll(ignoredCursorFilter),
			).toHaveLength(1)
			expect(getInfiniteKeyMeta(objectKey)).toBe(originalInfinite)
			expect(getInfiniteKeyMeta(objectKey)?.initialPageParam).toEqual(
				objectCursor,
			)

			const bigintHash = (queryKey: QueryKey) =>
				JSON.stringify(queryKey, (_key, value) =>
					typeof value === "bigint" ? `bigint:${value}` : value,
				) ?? ""
			const bigintQueryClient = new QueryClient({
				defaultOptions: {
					queries: { queryKeyHashFn: bigintHash, retry: false },
				},
			})
			const bigintEden = createCompositeEden(bigintQueryClient)
			const bigintKey = bigintEden.cursor.get.infiniteQueryKey(
				compositeCursorInput,
				{
					initialCursor: 1n,
				},
			)
			bigintQueryClient.setQueryData(bigintKey, { pages: [], pageParams: [] })

			const findBigint = (initialCursor: bigint) =>
				bigintQueryClient.getQueryCache().findAll(
					bigintEden.cursor.get.infiniteQueryFilter(compositeCursorInput, {
						initialCursor,
					}),
				)
			expect(findBigint(1n)).toHaveLength(1)
			expect(findBigint(2n)).toHaveLength(0)
		})

		test("keeps request headers in cache identity", async () => {
			const requests: string[] = []
			const client = {
				api: {
					users: {
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

			const aliceInput = {
				status: "active",
				headers: { Authorization: "Bearer alice" },
			}
			const alice = eden.api.users.get.queryOptions(aliceInput)
			const bob = eden.api.users.get.queryOptions({
				status: "active",
				headers: { Authorization: "Bearer bob" },
			})
			const helperKey = eden.api.users.get.queryKey(aliceInput)

			expect(alice.queryKey).toEqual([
				["api", "users", "get"],
				{ input: aliceInput, type: "query" },
			])
			expect(helperKey).toEqual(alice.queryKey)

			expect(alice.queryKey).not.toEqual(bob.queryKey)
			expect(await isolatedQueryClient.fetchQuery(alice)).toBe("Bearer alice")
			expect(await isolatedQueryClient.fetchQuery(bob)).toBe("Bearer bob")
			expect(requests).toEqual(["Bearer alice", "Bearer bob"])

			const wrappedInput = {
				query: { status: "active" },
				headers: { Authorization: "Bearer alice" },
			}
			expect(eden.api.users.get.queryOptions(wrappedInput).queryKey).toEqual([
				["api", "users", "get"],
				{ input: wrappedInput, type: "query" },
			])
		})

		test("normalizes numeric path params in the key", () => {
			const eden = createEden()

			// biome-ignore lint/suspicious/noExplicitAny: same URL, same key
			const numeric = (eden as any).api.users({ id: 123 }).get.queryKey()
			const stringy = eden.api.users({ id: "123" }).get.queryKey()

			expect(numeric).toEqual(stringy)
		})

		test("rejects skipToken in key-only helpers", () => {
			const eden = createEden()

			expect(() => {
				// @ts-expect-error Runtime guard for JavaScript callers
				eden.api.users.get.queryKey(skipToken)
			}).toThrow("skipToken is only supported by queryOptions")
			expect(() => {
				// @ts-expect-error Runtime guard for JavaScript callers
				eden.api.posts.get.infiniteQueryKey(skipToken)
			}).toThrow("skipToken is only supported by infiniteQueryOptions")
		})

		test("skipToken observer does not replace an enabled query function", async () => {
			let requestCount = 0
			let defaultRequestCount = 0
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
			const isolatedQueryClient = new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
						queryFn: async () => {
							defaultRequestCount++
							return "default"
						},
					},
				},
			})
			const eden = createEdenOptionsProxy<App>({
				client,
				queryClient: isolatedQueryClient,
			})
			const enabledOptions = eden.api.users.get.queryOptions()
			const skippedOptions = eden.api.users.get.queryOptions(skipToken)
			expect(skippedOptions.queryKey).toEqual(enabledOptions.queryKey)
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
			expect(defaultRequestCount).toBe(0)
			unsubscribeSkipped()
			unsubscribeEnabled()
			isolatedQueryClient.clear()
		})

		test("infinite skipToken blocks the global default query function", async () => {
			let defaultRequestCount = 0
			const isolatedQueryClient = new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
						queryFn: async () => {
							defaultRequestCount++
							return "default"
						},
					},
				},
			})
			const eden = createEden()
			const skipped = eden.api.posts.get.infiniteQueryOptions(skipToken, {
				getNextPageParam: () => undefined,
			})

			expect(Object.hasOwn(skipped, "queryFn")).toBe(true)
			await expect(
				isolatedQueryClient.fetchInfiniteQuery(skipped),
			).rejects.toBeDefined()
			expect(defaultRequestCount).toBe(0)
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
				input: {},
				pathParams: [{ pathIndex: 1, entries: [["id", "123"]] }],
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

			// Single has ordered path identity
			expect(singleKey).toEqual([
				["api", "users", "get"],
				{
					pathParams: [{ pathIndex: 1, entries: [["id", "123"]] }],
					type: "query",
				},
			])
		})

		test("queryKey with pathParams and additional input", () => {
			const eden = createEden()

			// Path: /api/users/:id with additional query params
			const key = eden.api
				.users({ id: "123" })
				.get.queryKey({ status: "active" })

			// Path params and request input keep separate identities
			expect(key).toEqual([
				["api", "users", "get"],
				{
					input: { status: "active" },
					pathParams: [{ pathIndex: 1, entries: [["id", "123"]] }],
					type: "query",
				},
			])
		})

		test("queryFilter includes pathParams", () => {
			const eden = createEden()

			const filter = eden.api.users({ id: "123" }).get.queryFilter()

			// type: "any" is omitted by getQueryKey when type is "any"
			expect(filter.queryKey[1]).toEqual({
				pathParams: [{ pathIndex: 1, entries: [["id", "123"]] }],
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

			expect(Object.hasOwn(options, "queryFn")).toBe(true)
			expect(options.queryFn).toBeUndefined()
			expect(options.enabled).toBe(false)
			expect(options.queryKey).toEqual([
				["api", "users", "get"],
				{
					pathParams: [{ pathIndex: 1, entries: [["id", "123"]] }],
					type: "query",
				},
			])
			expect(options.queryKey).toEqual(
				eden.api.users({ id: "123" }).get.queryOptions().queryKey,
			)
			expect(options.queryKey).not.toEqual(
				eden.api.users.get.queryOptions().queryKey,
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
			expect(key1[1]).toEqual({
				pathParams: [{ pathIndex: 3, entries: [["userId", "aaa"]] }],
				type: "query",
			})
			expect(key2[1]).toEqual({
				pathParams: [{ pathIndex: 3, entries: [["userId", "bbb"]] }],
				type: "query",
			})
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
				input: { role: "admin" },
				pathParams: [
					{ pathIndex: 1, entries: [["orgId", "o1"]] },
					{ pathIndex: 2, entries: [["teamId", "t2"]] },
				],
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

			expect(Object.hasOwn(options, "queryFn")).toBe(true)
			expect(options.queryFn).toBeUndefined()
			expect(options.enabled).toBe(false)
			expect(options.queryKey).toEqual([
				["api", "comments", "get"],
				{
					pathParams: [{ pathIndex: 1, entries: [["postId", "42"]] }],
					type: "infinite",
					infinite: { initialPageParam: null },
				},
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
