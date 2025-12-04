import { edenMutationOptions } from "../../src/options/mutationOptions"
import { createTestQueryClient } from "../../test-utils"

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
