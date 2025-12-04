import { skipToken } from "@tanstack/react-query"
import { edenQueryOptions } from "../../src/options/queryOptions"
import { createTestQueryClient } from "../../test-utils"

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
