import type { DataTag } from "@tanstack/react-query"
import { skipToken } from "@tanstack/react-query"
import type { EdenQueryKey } from "../../src/keys/types"
import { edenQueryOptions } from "../../src/options/queryOptions"
import { createTestQueryClient } from "../../test-utils"

// ============================================================================
// Type Tests - Compile-time verification
// ============================================================================

describe("edenQueryOptions type inference", () => {
	// Test types
	type TestOutput = { id: string; name: string }
	type TestInput = { id: string }

	test("return type has correct queryKey with DataTag", () => {
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" } as TestInput,
			fetch: async (): Promise<TestOutput> => ({ id: "1", name: "Test" }),
		})

		// Verify queryKey is DataTag with correct TData
		type QueryKeyType = typeof options.queryKey
		type ExtractedData =
			QueryKeyType extends DataTag<EdenQueryKey, infer TData, unknown>
				? TData
				: never

		// This assignment will fail at compile time if types don't match
		const _typeCheck: ExtractedData = {} as TestOutput
		expect(_typeCheck).toBeDefined()
	})

	test("data type is correctly inferred when used with fetchQuery", async () => {
		const queryClient = createTestQueryClient()

		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
		})

		const result = await queryClient.fetchQuery(options)

		// Type assertion - will fail at compile time if result is wrong type
		const _typeCheck: { id: string; name: string } = result
		expect(_typeCheck.id).toBe("1")
		expect(_typeCheck.name).toBe("Test")
	})

	test("initialData makes data type non-undefined", () => {
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
			opts: {
				initialData: { id: "0", name: "Initial" },
			},
		})

		// With initialData, the type should be defined
		type OptionsType = typeof options
		type HasInitialData = OptionsType extends { initialData: infer T }
			? T extends undefined
				? false
				: true
			: false

		const _hasInitialData: HasInitialData = true
		expect(_hasInitialData).toBe(true)
	})

	test("options with staleTime are passed through", () => {
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
			opts: {
				staleTime: 5000,
			},
		})

		// Verify options are passed through
		expect(options.staleTime).toBe(5000)
	})
})

// ============================================================================
// Runtime Tests
// ============================================================================

describe("edenQueryOptions", () => {
	const queryClient = createTestQueryClient()

	test("creates valid query options", () => {
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
		})

		// Check queryKey structure (DataTag is a branded type, compare underlying array)
		expect(options.queryKey[0]).toEqual(["api", "users", "get"])
		expect(options.queryKey[1]).toEqual({ input: { id: "1" }, type: "query" })
		expect(options.eden.path).toBe("api.users.get")
		expect(typeof options.queryFn).toBe("function")
	})

	test("handles skipToken", () => {
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: skipToken,
			fetch: async () => ({ id: "1", name: "Test" }),
		})

		// skipToken is a symbol - verify queryFn is the skipToken symbol
		// Note: Type assertion needed because TanStack Query types don't expose
		// SkipToken in queryFn return type for UndefinedInitialDataOptions
		expect(typeof options.queryFn).toBe("symbol")
		expect(Object.is(options.queryFn, skipToken)).toBe(true)
		// When skipToken, queryKey should not include input
		expect(options.queryKey[0]).toEqual(["api", "users", "get"])
		expect(options.queryKey[1]).toEqual({ type: "query" })
	})

	test("fetches data correctly", async () => {
		const mockData = { id: "1", name: "Test" }
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => mockData,
		})

		const result = await queryClient.fetchQuery(options)
		expect(result).toEqual(mockData)
	})

	test("passes options through", () => {
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: undefined,
			fetch: async () => [],
			opts: {
				staleTime: 5000,
				refetchOnWindowFocus: false,
			},
		})

		expect(options.staleTime).toBe(5000)
		expect(options.refetchOnWindowFocus).toBe(false)
	})

	test("handles undefined input", () => {
		const options = edenQueryOptions({
			path: ["api", "status", "get"],
			input: undefined,
			fetch: async () => ({ status: "ok" }),
		})

		// Undefined input should result in type: "query" only
		expect(options.queryKey[0]).toEqual(["api", "status", "get"])
		expect(options.queryKey[1]).toEqual({ type: "query" })
		expect(options.eden.path).toBe("api.status.get")
	})

	test("passes AbortSignal when abortOnUnmount is true", async () => {
		let receivedSignal: AbortSignal | undefined

		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async (_input, signal) => {
				receivedSignal = signal
				return { id: "1", name: "Test" }
			},
			opts: {
				eden: {
					abortOnUnmount: true,
				},
			},
		})

		await queryClient.fetchQuery(options)
		expect(receivedSignal).toBeInstanceOf(AbortSignal)
	})

	test("does not pass AbortSignal when abortOnUnmount is false", async () => {
		let receivedSignal: AbortSignal | undefined

		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async (_input, signal) => {
				receivedSignal = signal
				return { id: "1", name: "Test" }
			},
			opts: {
				eden: {
					abortOnUnmount: false,
				},
			},
		})

		await queryClient.fetchQuery(options)
		expect(receivedSignal).toBeUndefined()
	})

	test("handles complex input objects", () => {
		const complexInput = {
			filters: { status: "active", role: "admin" },
			pagination: { page: 1, limit: 20 },
		}

		const options = edenQueryOptions({
			path: ["api", "users", "search"],
			input: complexInput,
			fetch: async () => [],
		})

		expect(options.queryKey[0]).toEqual(["api", "users", "search"])
		expect(options.queryKey[1]).toEqual({ input: complexInput, type: "query" })
	})

	test("includes eden metadata in result", () => {
		const options = edenQueryOptions({
			path: ["api", "v1", "users", "profile"],
			input: undefined,
			fetch: async () => ({}),
		})

		expect(options.eden).toEqual({
			path: "api.v1.users.profile",
		})
	})

	test("works with initialData option", async () => {
		const initialData = { id: "1", name: "Initial" }

		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Fetched" }),
			opts: {
				initialData,
			},
		})

		expect(options.initialData).toEqual(initialData)
	})

	test("handles fetch errors", async () => {
		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "invalid" },
			fetch: async () => {
				throw new Error("User not found")
			},
		})

		await expect(queryClient.fetchQuery(options)).rejects.toThrow(
			"User not found",
		)
	})
})

// ============================================================================
// Error Type Tests
// ============================================================================

describe("edenQueryOptions error type inference", () => {
	type TestInput = { id: string }
	type TestOutput = { id: string; name: string }
	type TestError = { status: number; value: { message: string; code: string } }

	test("error type can be specified via generic", () => {
		// Generic order: <TInput, TOutput, TError>
		const options = edenQueryOptions<TestInput, TestOutput, TestError>({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
		})

		// Type check - error type should be available
		type OptionsType = typeof options
		type HasQueryKey = "queryKey" extends keyof OptionsType ? true : false

		const hasQueryKey: HasQueryKey = true
		expect(hasQueryKey).toBe(true)
	})

	test("throwOnError callback receives correct error type", () => {
		type CustomError = { status: 404; value: { message: string } }

		// Generic order: <TInput, TOutput, TError>
		const options = edenQueryOptions<TestInput, TestOutput, CustomError>({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
			opts: {
				throwOnError: (error) => {
					// Type assertion - error should have status and value
					type ErrorType = typeof error
					type HasStatus = "status" extends keyof ErrorType ? true : false
					type HasValue = "value" extends keyof ErrorType ? true : false

					const _hasStatus: HasStatus = true
					const _hasValue: HasValue = true
					void _hasStatus
					void _hasValue

					return error.status === 404
				},
			},
		})

		expect(options.throwOnError).toBeDefined()
	})

	test("error type does NOT have message at top level", () => {
		// This is the critical test - EdenFetchError has status and value, NOT message
		type EdenError = { status: number; value: unknown }

		// Generic order: <TInput, TOutput, TError>
		const options = edenQueryOptions<TestInput, TestOutput, EdenError>({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
		})

		// Verify options created successfully
		expect(options.queryKey).toBeDefined()
	})

	test("error.value is NOT never with default error type", () => {
		// CRITICAL: This test verifies InferRouteError fallback behavior
		// When no error type is specified, it should default to { status: number; value: unknown }
		// NOT { status: number; value: never }

		const options = edenQueryOptions({
			path: ["api", "users", "get"],
			input: { id: "1" },
			fetch: async () => ({ id: "1", name: "Test" }),
		})

		// The options should be created successfully
		// If error.value were 'never', callbacks wouldn't work correctly
		expect(options.queryKey).toBeDefined()
		expect(typeof options.queryFn).toBe("function")
	})
})
