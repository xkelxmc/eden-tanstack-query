/**
 * Integration tests for useQuery with Eden TanStack Query
 *
 * Tests the full flow: useEden() -> queryOptions() -> useQuery()
 * Verifies both runtime behavior and type inference
 */

import type { treaty } from "@elysiajs/eden"
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { Elysia, t } from "elysia"
import type { ReactNode } from "react"

import { createEdenTanStackQuery } from "../../src"
import { assertType, type Equals } from "../../test-utils/type-assert"

// ============================================================================
// Test App Setup (similar to example/basic server)
// ============================================================================

const app = new Elysia()
	.get("/hello", () => ({ message: "Hello from Elysia!" }))
	.get("/users", () => [
		{ id: "1", name: "Alice" },
		{ id: "2", name: "Bob" },
	])
	.get(
		"/users/:id",
		({ params }) => ({
			id: params.id,
			name: `User ${params.id}`,
		}),
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.post(
		"/users",
		({ body }) => ({
			id: String(Date.now()),
			...body,
		}),
		{
			body: t.Object({
				name: t.String(),
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
		hello: {
			get: async () => ({
				data: { message: "Hello from Elysia!" },
				error: null,
			}),
		},
		users: Object.assign(
			// Callable for path params: eden.users({ id: '1' })
			(params: { id: string }) => ({
				get: async () => ({
					data: { id: params.id, name: `User ${params.id}` },
					error: null,
				}),
			}),
			// Direct methods
			{
				get: async () => ({
					data: [
						{ id: "1", name: "Alice" },
						{ id: "2", name: "Bob" },
					],
					error: null,
				}),
				post: async (body: { name: string }) => ({
					data: { id: "123", ...body },
					error: null,
				}),
			},
		),
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

describe("useQuery integration", () => {
	describe("basic query flow", () => {
		test("useQuery with eden.hello.get.queryOptions()", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const query = useQuery(eden.hello.get.queryOptions())
					assertType<
						Equals<typeof query.data, { message: string } | undefined>
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

			// Check data
			expect(result.current.data).toEqual({ message: "Hello from Elysia!" })
		})

		test("useQuery with eden.users.get.queryOptions()", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const query = useQuery(eden.users.get.queryOptions())
					assertType<
						Equals<
							typeof query.data,
							{ id: string; name: string }[] | undefined
						>
					>()
					return query
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(Array.isArray(result.current.data)).toBe(true)
			expect(result.current.data).toEqual([
				{ id: "1", name: "Alice" },
				{ id: "2", name: "Bob" },
			])
		})
	})

	describe("queryOptions structure", () => {
		test("queryOptions has correct queryKey", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.hello.get.queryOptions()
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.queryKey[0]).toEqual(["hello", "get"])
		})

		test("queryOptions has eden metadata", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.hello.get.queryOptions()
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.eden.path).toBe("hello.get")
		})

		test("queryOptions has queryFn", () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.hello.get.queryOptions()
				},
				{ wrapper: Wrapper },
			)

			expect(typeof result.current.queryFn).toBe("function")
		})
	})

	describe("path params", () => {
		test("useQuery with path params: eden.users({ id }).get.queryOptions()", async () => {
			const { Wrapper } = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useQuery(eden.users({ id: "42" }).get.queryOptions())
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toEqual({ id: "42", name: "User 42" })
		})
	})

	describe("error handling", () => {
		function createErrorMockClient() {
			const mockClient = {
				hello: {
					get: async () => ({
						data: null,
						error: { status: 500, value: { message: "Internal Server Error" } },
					}),
				},
				users: Object.assign(
					(params: { id: string }) => ({
						get: async () => ({
							data: null,
							error: {
								status: 404,
								value: { message: `User ${params.id} not found` },
							},
						}),
					}),
					{
						get: async () => ({
							data: null,
							error: { status: 403, value: { message: "Forbidden" } },
						}),
					},
				),
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

		test("useQuery handles error state", async () => {
			const { Wrapper } = createErrorWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useQuery(eden.hello.get.queryOptions())
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
					const query = useQuery(eden.hello.get.queryOptions())

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
					return useQuery(eden.hello.get.queryOptions())
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error?.status).toBe(500)
			expect(result.current.error?.value).toEqual({
				message: "Internal Server Error",
			})
		})

		test("error with path params contains correct error", async () => {
			const { Wrapper } = createErrorWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useQuery(eden.users({ id: "999" }).get.queryOptions())
				},
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error?.status).toBe(404)
			expect(result.current.error?.value).toEqual({
				message: "User 999 not found",
			})
		})

		test("error.value is NOT never when route has no defined error responses", async () => {
			// CRITICAL: This test verifies the InferRouteError fix
			// When a route only has success responses (200), error.value should be 'unknown', not 'never'
			const { Wrapper } = createErrorWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const query = useQuery(eden.hello.get.queryOptions())

					// CRITICAL: Compile-time type check
					// error.value should be accessible (not never)
					// If InferRouteError returns never, this would fail to compile
					if (query.error) {
						type ErrorType = typeof query.error
						type ValueType = ErrorType["value"]

						// value should NOT be never - it should be unknown (the fallback)
						type IsNotNever = [ValueType] extends [never] ? false : true
						const _isNotNever: IsNotNever = true
						void _isNotNever

						// We should be able to access value without TS error
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

			// Runtime check - value should be accessible
			expect(result.current.error?.value).toBeDefined()
		})
	})
})
