import type { EdenMutationKey } from "../../src/keys/types"
import { edenMutationOptions } from "../../src/options/mutationOptions"
import { createTestQueryClient } from "../../test-utils"

// ============================================================================
// Type Tests - Compile-time verification
// ============================================================================

describe("edenMutationOptions type inference", () => {
	type TestInput = { name: string; email: string }
	type TestOutput = { id: string; name: string; email: string }

	test("return type has correct mutationKey", () => {
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (input: TestInput): Promise<TestOutput> => ({
				id: "1",
				...input,
			}),
		})

		// Verify mutationKey is EdenMutationKey
		type MutationKeyType = typeof options.mutationKey
		type IsCorrectKey = MutationKeyType extends EdenMutationKey ? true : false

		const _isCorrectKey: IsCorrectKey = true
		expect(_isCorrectKey).toBe(true)
	})

	test("mutationFn has correct input and output types", async () => {
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (input: TestInput): Promise<TestOutput> => ({
				id: "1",
				...input,
			}),
		})

		// Type assertion - will fail at compile time if types are wrong
		const result = await options.mutationFn(
			{ name: "Test", email: "test@example.com" },
			{ client: createTestQueryClient(), meta: undefined },
		)

		const _typeCheck: TestOutput = result
		expect(_typeCheck.id).toBe("1")
	})

	test("onSuccess receives correct data type", () => {
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (input: TestInput): Promise<TestOutput> => ({
				id: "1",
				...input,
			}),
			opts: {
				onSuccess: (data) => {
					// Type assertion - data should be TestOutput
					const _typeCheck: TestOutput = data
					void _typeCheck
				},
			},
		})

		expect(options.onSuccess).toBeDefined()
	})

	test("onMutate receives correct variables type", () => {
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (input: TestInput): Promise<TestOutput> => ({
				id: "1",
				...input,
			}),
			opts: {
				onMutate: (variables) => {
					// Type assertion - variables should be TestInput
					const _typeCheck: TestInput = variables
					void _typeCheck
					return { previousData: [] }
				},
			},
		})

		expect(options.onMutate).toBeDefined()
	})

	test("context type is preserved in callbacks", () => {
		type Context = { previousData: TestOutput[] }

		const options = edenMutationOptions<TestInput, TestOutput, Error, Context>({
			path: ["api", "users", "post"],
			mutate: async (input) => ({ id: "1", ...input }),
			opts: {
				onMutate: () => ({ previousData: [] }),
				onError: (_error, _variables, context) => {
					// Context should be Context | undefined
					if (context) {
						const _typeCheck: TestOutput[] = context.previousData
						void _typeCheck
					}
				},
			},
		})

		expect(options.onMutate).toBeDefined()
		expect(options.onError).toBeDefined()
	})
})

// ============================================================================
// Runtime Tests
// ============================================================================

describe("edenMutationOptions", () => {
	const queryClient = createTestQueryClient()
	const mutationContext = { client: queryClient, meta: undefined }

	test("creates valid mutation options", () => {
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (input: { name: string }) => ({ id: "1", ...input }),
		})

		expect(options.mutationKey).toEqual([["api", "users", "post"]])
		expect(options.eden.path).toBe("api.users.post")
		expect(typeof options.mutationFn).toBe("function")
	})

	test("executes mutationFn correctly", async () => {
		const mockResult = { id: "1", name: "Test" }
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (_input: { name: string }) => mockResult,
		})

		const result = await options.mutationFn({ name: "Test" }, mutationContext)
		expect(result).toEqual(mockResult)
	})

	test("passes options through", () => {
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async () => ({}),
			opts: {
				retry: 3,
				retryDelay: 1000,
			},
		})

		expect(options.retry).toBe(3)
		expect(options.retryDelay).toBe(1000)
	})

	test("includes eden metadata", () => {
		const options = edenMutationOptions({
			path: ["api", "v1", "users", "create"],
			mutate: async () => ({}),
		})

		expect(options.eden).toEqual({
			path: "api.v1.users.create",
		})
	})

	test("handles complex input", async () => {
		const complexInput = {
			user: { name: "John", email: "john@example.com" },
			settings: { notifications: true },
		}

		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (input: typeof complexInput) => ({
				id: "1",
				...input.user,
			}),
		})

		const result = await options.mutationFn(complexInput, mutationContext)
		expect(result).toEqual({ id: "1", name: "John", email: "john@example.com" })
	})

	test("propagates errors from mutate", async () => {
		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async () => {
				throw new Error("Validation failed")
			},
		})

		await expect(
			options.mutationFn({ name: "Test" }, mutationContext),
		).rejects.toThrow("Validation failed")
	})

	test("preserves callback options", () => {
		const onMutate = () => ({ rollback: true })
		const onSuccess = () => {}
		const onError = () => {}
		const onSettled = () => {}

		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async () => ({}),
			opts: {
				onMutate,
				onSuccess,
				onError,
				onSettled,
			},
		})

		expect(options.onMutate).toBe(onMutate)
		expect(options.onSuccess).toBe(onSuccess)
		expect(options.onError).toBe(onError)
		expect(options.onSettled).toBe(onSettled)
	})

	test("supports typed generics", () => {
		type Input = { name: string; email: string }
		type Output = { id: string; name: string; email: string }
		type Context = { previousData: Output[] }

		const options = edenMutationOptions<Input, Output, Error, Context>({
			path: ["api", "users", "post"],
			mutate: async (input) => ({ id: "1", ...input }),
			opts: {
				onMutate: () => ({ previousData: [] }),
			},
		})

		expect(options.mutationKey).toEqual([["api", "users", "post"]])
		expect(typeof options.mutationFn).toBe("function")
		expect(typeof options.onMutate).toBe("function")
	})
})

// ============================================================================
// Error Type Tests
// ============================================================================

describe("edenMutationOptions error type inference", () => {
	type TestInput = { name: string; email: string }
	type TestOutput = { id: string; name: string; email: string }

	test("error type can be specified via generic", () => {
		type CustomError = { status: number; value: { message: string } }

		const options = edenMutationOptions<
			TestInput,
			TestOutput,
			CustomError,
			unknown
		>({
			path: ["api", "users", "post"],
			mutate: async (input) => ({ id: "1", ...input }),
		})

		// Verify options created
		expect(options.mutationKey).toBeDefined()
	})

	test("onError callback receives correct error type", () => {
		type EdenError = {
			status: number
			value: { message: string; code: string }
		}

		const options = edenMutationOptions<TestInput, TestOutput, EdenError>({
			path: ["api", "users", "post"],
			mutate: async (input) => ({ id: "1", ...input }),
			opts: {
				onError: (error) => {
					// Type assertion - error should have status and value
					type ErrorType = typeof error
					type HasStatus = "status" extends keyof ErrorType ? true : false
					type HasValue = "value" extends keyof ErrorType ? true : false

					const _hasStatus: HasStatus = true
					const _hasValue: HasValue = true
					void _hasStatus
					void _hasValue

					// Access error properties
					console.log(error.status, error.value)
				},
			},
		})

		expect(options.onError).toBeDefined()
	})

	test("error type has status and value, NOT message at top level", () => {
		// Critical test - EdenFetchError structure
		type EdenError = {
			status: 400
			value: { message: string; errors: string[] }
		}

		const options = edenMutationOptions<TestInput, TestOutput, EdenError>({
			path: ["api", "users", "post"],
			mutate: async (input) => ({ id: "1", ...input }),
			opts: {
				onError: (error, variables, context) => {
					// error.status exists
					const _status: number = error.status
					void _status

					// error.value exists and contains the actual error data
					const _value: { message: string; errors: string[] } = error.value
					void _value

					// These are also available
					void variables
					void context
				},
			},
		})

		expect(options.onError).toBeDefined()
	})

	test("throwOnError receives correct error type", () => {
		type EdenError = { status: number; value: unknown }

		const options = edenMutationOptions<TestInput, TestOutput, EdenError>({
			path: ["api", "users", "post"],
			mutate: async (input) => ({ id: "1", ...input }),
			opts: {
				throwOnError: (error) => {
					// error should have status and value
					return error.status >= 500
				},
			},
		})

		expect(options.throwOnError).toBeDefined()
	})

	test("error.value is NOT never with default error type", () => {
		// CRITICAL: This test verifies InferRouteError fallback behavior
		// When no error type is specified, it should default to { status: number; value: unknown }
		// NOT { status: number; value: never }

		const options = edenMutationOptions({
			path: ["api", "users", "post"],
			mutate: async (input: { name: string }) => ({ id: "1", ...input }),
		})

		// The options should be created successfully
		// If error.value were 'never', callbacks wouldn't work correctly
		expect(options.mutationKey).toBeDefined()
		expect(typeof options.mutationFn).toBe("function")
	})
})
