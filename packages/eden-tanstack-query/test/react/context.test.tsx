import type { treaty } from "@elysiajs/eden"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { Elysia, t } from "elysia"
import type * as React from "react"
import { createEdenTanStackQuery } from "../../src"

// ============================================================================
// Test App Definition
// ============================================================================

const app = new Elysia()
	.get("/hello", () => "world")
	.get(
		"/users",
		({ query }) => {
			return [{ id: "1", name: "John", status: query.status ?? "active" }]
		},
		{
			query: t.Object({
				status: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/users",
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
		"/users/:id",
		({ params }) => {
			return { id: params.id, name: "User" }
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)

type App = typeof app

// ============================================================================
// Create typed hooks
// ============================================================================

const { EdenProvider, useEden, useEdenClient } = createEdenTanStackQuery<App>()

// ============================================================================
// Mock Eden Client
// ============================================================================

function createMockTreatyClient() {
	const mockClient = {
		hello: {
			get: async () => ({ data: "world", error: null }),
		},
		users: Object.assign(
			(params: { id: string }) => ({
				get: async () => ({
					data: { id: params.id, name: "User" },
					error: null,
				}),
			}),
			{
				get: async (opts?: { query?: { status?: string } }) => ({
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
	}

	return mockClient as unknown as ReturnType<typeof treaty<App>>
}

// ============================================================================
// Test Wrapper Factory
// ============================================================================

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})
	const client = createMockTreatyClient()

	return function Wrapper({ children }: { children: React.ReactNode }) {
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

describe("React Context", () => {
	describe("useEden", () => {
		test("returns proxy with queryOptions", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEden(), { wrapper })

			expect(result.current.hello.get.queryOptions).toBeDefined()
			expect(typeof result.current.hello.get.queryOptions).toBe("function")
		})

		test("returns proxy with queryKey", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEden(), { wrapper })

			expect(typeof result.current.hello.get.queryKey).toBe("function")
		})

		test("returns proxy with mutationOptions", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEden(), { wrapper })

			expect(typeof result.current.users.post.mutationOptions).toBe("function")
		})

		test("throws without provider", () => {
			expect(() => {
				renderHook(() => useEden())
			}).toThrow("useEden must be used within an EdenProvider")
		})
	})

	describe("useEdenClient", () => {
		test("returns Eden client", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEdenClient(), { wrapper })

			expect(result.current.hello.get).toBeDefined()
			expect(result.current.users.get).toBeDefined()
		})

		test("throws without provider", () => {
			expect(() => {
				renderHook(() => useEdenClient())
			}).toThrow("useEdenClient must be used within an EdenProvider")
		})
	})

	describe("EdenProvider", () => {
		test("updates both hooks when the Eden client changes without queryClient", () => {
			let client = createMockTreatyClient()
			const wrapper = ({ children }: { children: React.ReactNode }) => (
				<EdenProvider client={client}>{children}</EdenProvider>
			)
			const { result, rerender } = renderHook(
				() => ({ proxy: useEden(), client: useEdenClient() }),
				{ wrapper },
			)
			const firstProxy = result.current.proxy

			expect(result.current.client).toBe(client)
			expect(firstProxy.hello.get.queryKey()).toEqual([
				["hello", "get"],
				{ type: "query" },
			])

			client = createMockTreatyClient()
			rerender()

			expect(result.current.client).toBe(client)
			expect(result.current.proxy === firstProxy).toBe(false)
		})

		test("keeps the proxy when only the legacy queryClient changes", () => {
			const client = createMockTreatyClient()
			let queryClient = new QueryClient()
			const wrapper = ({ children }: { children: React.ReactNode }) => (
				<EdenProvider client={client} queryClient={queryClient}>
					{children}
				</EdenProvider>
			)
			const { result, rerender } = renderHook(
				() => ({ proxy: useEden(), client: useEdenClient() }),
				{ wrapper },
			)
			const firstProxy = result.current.proxy

			queryClient = new QueryClient()
			rerender()

			expect(result.current.proxy === firstProxy).toBe(true)
			expect(result.current.client).toBe(client)
		})

		test("provides context to children", () => {
			const wrapper = createWrapper()

			// Both hooks should work
			const edenResult = renderHook(() => useEden(), { wrapper })
			const clientResult = renderHook(() => useEdenClient(), { wrapper })

			expect(edenResult.result.current).toBeDefined()
			expect(clientResult.result.current).toBeDefined()
		})

		test("memoizes proxy across renders", () => {
			const wrapper = createWrapper()

			const { result, rerender } = renderHook(() => useEden(), { wrapper })

			const firstProxy = result.current
			rerender()
			const secondProxy = result.current

			// Proxy should be the same reference (memoized)
			expect(firstProxy).toBe(secondProxy)
		})
	})

	describe("queryOptions integration", () => {
		test("generates valid query options from context", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEden(), { wrapper })

			const options = result.current.hello.get.queryOptions()

			expect(options.queryKey[0]).toEqual(["hello", "get"])
			expect(typeof options.queryFn).toBe("function")
			expect(options.eden.path).toBe("hello.get")
		})

		test("generates query key with input", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEden(), { wrapper })

			const key = result.current.users.get.queryKey({ status: "active" })

			expect(key[0]).toEqual(["users", "get"])
			expect(key[1]).toEqual({ input: { status: "active" }, type: "query" })
		})

		test("generates mutation options", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEden(), { wrapper })

			const options = result.current.users.post.mutationOptions()

			expect(options.mutationKey).toEqual([["users", "post"]])
			expect(typeof options.mutationFn).toBe("function")
		})
	})

	describe("path params support", () => {
		test("handles path params in context", () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useEden(), { wrapper })

			const options = result.current.users({ id: "123" }).get.queryOptions()

			expect(options.eden.path).toBe("users.get")
			expect(typeof options.queryFn).toBe("function")
		})
	})
})

describe("createEdenTanStackQuery", () => {
	test("returns EdenProvider component", () => {
		const result = createEdenTanStackQuery<App>()
		expect(result.EdenProvider).toBeDefined()
		expect(typeof result.EdenProvider).toBe("function")
	})

	test("returns useEden hook", () => {
		const result = createEdenTanStackQuery<App>()
		expect(result.useEden).toBeDefined()
		expect(typeof result.useEden).toBe("function")
	})

	test("returns useEdenClient hook", () => {
		const result = createEdenTanStackQuery<App>()
		expect(result.useEdenClient).toBeDefined()
		expect(typeof result.useEdenClient).toBe("function")
	})
})
