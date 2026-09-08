/**
 * Integration tests for useMutation with Eden TanStack Query
 *
 * Tests the full flow: useEden() -> mutationOptions() -> useMutation()
 * Verifies both runtime behavior and type inference
 */

import type { treaty } from "@elysiajs/eden"
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
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
	.post(
		"/users",
		({ body }) => ({
			id: String(Date.now()),
			name: body.name,
			email: body.email,
		}),
		{
			body: t.Object({
				name: t.String(),
				email: t.String(),
			}),
		},
	)
	.put(
		"/users/:id",
		({ params, body }) => ({
			id: params.id,
			name: body.name,
			email: body.email,
		}),
		{
			body: t.Object({
				name: t.String(),
				email: t.String(),
			}),
		},
	)
	.delete("/users/:id", ({ params }) => ({
		deleted: true,
		id: params.id,
	}))

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
		users: Object.assign(
			// Callable for path params: eden.users({ id: '1' })
			(params: { id: string }) => ({
				put: async (body: { name: string; email: string }) => ({
					data: { id: params.id, ...body },
					error: null,
				}),
				delete: async () => ({
					data: { deleted: true, id: params.id },
					error: null,
				}),
			}),
			// Direct methods
			{
				post: async (body: { name: string; email: string }) => ({
					data: { id: "new-123", ...body },
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

function createWrapper(client = createMockClient()) {
	const queryClient = new QueryClient({
		defaultOptions: {
			mutations: {
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

describe("useMutation integration", () => {
	describe("basic mutation flow", () => {
		test("useMutation with eden.users.post.mutationOptions()", async () => {
			const Wrapper = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const mutation = useMutation(eden.users.post.mutationOptions())
					assertType<
						Equals<
							typeof mutation.data,
							{ id: string; name: string; email: string } | undefined
						>
					>()
					assertType<
						Equals<
							typeof mutation.variables,
							{ name: string; email: string } | undefined
						>
					>()
					return mutation
				},
				{ wrapper: Wrapper },
			)

			// Initially idle
			expect(result.current.isIdle).toBe(true)

			// Trigger mutation
			result.current.mutate({ name: "John", email: "john@example.com" })

			// Wait for success
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.variables).toEqual({
				name: "John",
				email: "john@example.com",
			})

			// Check data
			expect(result.current.data).toEqual({
				id: "new-123",
				name: "John",
				email: "john@example.com",
			})
		})

		test("useMutation with path params: eden.users({ id }).put.mutationOptions()", async () => {
			const Wrapper = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useMutation(eden.users({ id: "42" }).put.mutationOptions())
				},
				{ wrapper: Wrapper },
			)

			// Trigger mutation
			result.current.mutate({ name: "Updated", email: "updated@example.com" })

			// Wait for success
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toEqual({
				id: "42",
				name: "Updated",
				email: "updated@example.com",
			})
		})

		test("useMutation with delete: eden.users({ id }).delete.mutationOptions()", async () => {
			const Wrapper = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useMutation(eden.users({ id: "99" }).delete.mutationOptions())
				},
				{ wrapper: Wrapper },
			)

			// Trigger mutation - delete has no body, EmptyToVoid allows calling without args
			result.current.mutate()

			// Wait for success
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toEqual({
				deleted: true,
				id: "99",
			})
		})
	})

	describe("mutationOptions structure", () => {
		test("mutationOptions exposes its key, metadata and function", () => {
			const Wrapper = createWrapper()

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return eden.users.post.mutationOptions()
				},
				{ wrapper: Wrapper },
			)

			expect(result.current.mutationKey).toEqual([["users", "post"]])
			expect(result.current.eden.path).toBe("users.post")
			expect(typeof result.current.mutationFn).toBe("function")
		})
	})

	describe("error handling", () => {
		function createErrorMockClient() {
			const mockClient = {
				users: Object.assign(
					(params: { id: string }) => ({
						put: async () => ({
							data: null,
							error: {
								status: 404,
								value: { message: `User ${params.id} not found` },
							},
						}),
						delete: async () => ({
							data: null,
							error: { status: 403, value: { message: "Cannot delete user" } },
						}),
					}),
					{
						post: async () => ({
							data: null,
							error: {
								status: 400,
								value: {
									message: "Validation failed",
									errors: ["email is required"],
								},
							},
						}),
					},
				),
			}
			return mockClient as unknown as ReturnType<typeof treaty<App>>
		}

		test("useMutation preserves error state and undeclared error details", async () => {
			const Wrapper = createWrapper(createErrorMockClient())

			const { result } = renderHook(
				() => {
					const eden = useEden()
					const mutation = useMutation(eden.users.post.mutationOptions())

					if (mutation.error) {
						type ErrorType = typeof mutation.error
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

						const _value: unknown = mutation.error.value
						void _value
					}

					return mutation
				},
				{ wrapper: Wrapper },
			)

			result.current.mutate({ name: "Test", email: "test@example.com" })

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error).toHaveProperty("status")
			expect(result.current.error).toHaveProperty("value")
			expect(result.current.error).toBeDefined()
			expect(result.current.error?.status).toBe(400)
			expect(result.current.error?.value).toEqual({
				message: "Validation failed",
				errors: ["email is required"],
			})
			expect(result.current.error?.value).toBeDefined()
		})

		test("error with path params mutation", async () => {
			const Wrapper = createWrapper(createErrorMockClient())

			const { result } = renderHook(
				() => {
					const eden = useEden()
					return useMutation(eden.users({ id: "999" }).put.mutationOptions())
				},
				{ wrapper: Wrapper },
			)

			result.current.mutate({ name: "Test", email: "test@example.com" })

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error?.status).toBe(404)
			expect(result.current.error?.value).toEqual({
				message: "User 999 not found",
			})
		})
	})
})
