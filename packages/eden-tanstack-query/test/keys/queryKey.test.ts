import { skipToken } from "@tanstack/react-query"
import { getMutationKey, getQueryKey } from "../../src/keys/queryKey"

describe("getQueryKey", () => {
	test("generates key from path only", () => {
		const key = getQueryKey({ path: ["api", "users", "get"] })
		expect(key).toEqual([["api", "users", "get"]])
	})

	test("includes input in metadata", () => {
		const key = getQueryKey({
			path: ["api", "users", "get"],
			input: { id: "1" },
		})
		expect(key).toEqual([["api", "users", "get"], { input: { id: "1" } }])
	})

	test("keeps ordered path params separate from request input", () => {
		const key = getQueryKey({
			path: ["api", "users", "get"],
			input: { id: "query" },
			pathParams: [
				{ pathIndex: 1, entries: [["id", "path-a"]] },
				{ pathIndex: 1, entries: [["id", "path-b"]] },
			],
			type: "query",
		})

		expect(key).toEqual([
			["api", "users", "get"],
			{
				input: { id: "query" },
				pathParams: [
					{ pathIndex: 1, entries: [["id", "path-a"]] },
					{ pathIndex: 1, entries: [["id", "path-b"]] },
				],
				type: "query",
			},
		])
	})

	test("preserves __proto__ when it is a path parameter name", () => {
		const first = getQueryKey({
			path: ["api", "users", "get"],
			pathParams: [{ pathIndex: 1, entries: [["__proto__", "first"]] }],
		})
		const second = getQueryKey({
			path: ["api", "users", "get"],
			pathParams: [{ pathIndex: 1, entries: [["__proto__", "second"]] }],
		})

		expect(first).not.toEqual(second)
		expect(first[1]).toEqual({
			pathParams: [{ pathIndex: 1, entries: [["__proto__", "first"]] }],
		})
	})

	test("includes type for query", () => {
		const key = getQueryKey({
			path: ["api", "users", "get"],
			input: { id: "1" },
			type: "query",
		})
		expect(key).toEqual([
			["api", "users", "get"],
			{ input: { id: "1" }, type: "query" },
		])
	})

	test("includes type for infinite queries", () => {
		const key = getQueryKey({
			path: ["api", "posts", "get"],
			input: { limit: 10 },
			type: "infinite",
		})
		expect(key).toEqual([
			["api", "posts", "get"],
			{ input: { limit: 10 }, type: "infinite" },
		])
	})

	test("strips cursor from infinite query input", () => {
		const key = getQueryKey({
			path: ["api", "posts", "get"],
			input: { limit: 10, cursor: "abc" },
			type: "infinite",
		})
		expect(key).toEqual([
			["api", "posts", "get"],
			{ input: { limit: 10 }, type: "infinite" },
		])
	})

	test("keeps user-owned direction in infinite query input", () => {
		const key = getQueryKey({
			path: ["api", "posts", "get"],
			input: { limit: 10, cursor: "abc", direction: "forward" },
			type: "infinite",
		})
		expect(key).toEqual([
			["api", "posts", "get"],
			{ input: { limit: 10, direction: "forward" }, type: "infinite" },
		])
	})

	test("does not include type when type is 'any'", () => {
		const key = getQueryKey({
			path: ["api", "users", "get"],
			input: { id: "1" },
			type: "any",
		})
		expect(key).toEqual([["api", "users", "get"], { input: { id: "1" } }])
	})

	test("returns path only when type is 'any' and no input", () => {
		const key = getQueryKey({
			path: ["api", "users", "get"],
			type: "any",
		})
		expect(key).toEqual([["api", "users", "get"]])
	})

	test("handles skipToken by returning path only", () => {
		const key = getQueryKey({
			path: ["api", "users", "get"],
			input: skipToken,
		})
		expect(key).toEqual([["api", "users", "get"]])
	})

	test("handles empty path array", () => {
		const key = getQueryKey({ path: [] })
		expect(key).toEqual([[]])
	})

	test("handles complex input objects", () => {
		const key = getQueryKey({
			path: ["api", "search"],
			input: {
				query: "test",
				filters: { status: "active", tags: ["a", "b"] },
				pagination: { page: 1, limit: 10 },
			},
		})
		expect(key).toEqual([
			["api", "search"],
			{
				input: {
					query: "test",
					filters: { status: "active", tags: ["a", "b"] },
					pagination: { page: 1, limit: 10 },
				},
			},
		])
	})

	test("handles null input", () => {
		const key = getQueryKey({
			path: ["api", "users", "get"],
			input: null,
		})
		expect(key).toEqual([["api", "users", "get"], { input: null }])
	})

	test("handles array input", () => {
		const key = getQueryKey({
			path: ["api", "users", "batch"],
			input: ["1", "2", "3"],
		})
		expect(key).toEqual([["api", "users", "batch"], { input: ["1", "2", "3"] }])
	})

	test("preserves Date values in input without collapsing", () => {
		const januaryDate = new Date("2026-01-01T00:00:00.000Z")
		const februaryDate = new Date("2026-02-01T00:00:00.000Z")

		const januaryKey = getQueryKey({
			path: ["api", "reports", "get"],
			input: { from: januaryDate },
		})
		const februaryKey = getQueryKey({
			path: ["api", "reports", "get"],
			input: { from: februaryDate },
		})

		expect(januaryKey).toEqual([
			["api", "reports", "get"],
			{ input: { from: januaryDate } },
		])
		expect(februaryKey).toEqual([
			["api", "reports", "get"],
			{ input: { from: februaryDate } },
		])
		expect(januaryKey).not.toEqual(februaryKey)
	})

	describe("prototype pollution protection", () => {
		// JSON.parse creates the own key that object literals cannot represent.
		test("strips an own __proto__ key from input", () => {
			const key = getQueryKey({
				path: ["api", "users", "get"],
				input: JSON.parse('{"id":"1","__proto__":{"isAdmin":true}}'),
			})
			expect(key).toEqual([["api", "users", "get"], { input: { id: "1" } }])
		})

		test("keeps constructor as a regular input key", () => {
			const a = getQueryKey({
				path: ["api", "search", "get"],
				input: { constructor: "a" },
			})
			const b = getQueryKey({
				path: ["api", "search", "get"],
				input: { constructor: "b" },
			})
			expect(a).toEqual([
				["api", "search", "get"],
				{ input: { constructor: "a" } },
			])
			expect(a).not.toEqual(b)
		})

		test("keeps prototype as a regular input key", () => {
			const key = getQueryKey({
				path: ["api", "users", "get"],
				input: { id: "1", prototype: "value" },
			})
			expect(key).toEqual([
				["api", "users", "get"],
				{ input: { id: "1", prototype: "value" } },
			])
		})

		test("strips own __proto__ keys from nested objects", () => {
			const key = getQueryKey({
				path: ["api", "users", "get"],
				input: {
					user: JSON.parse('{"name":"test","__proto__":{"isAdmin":true}}'),
				},
			})
			expect(key).toEqual([
				["api", "users", "get"],
				{ input: { user: { name: "test" } } },
			])
		})

		test("preserves valid input with similar-looking keys", () => {
			const key = getQueryKey({
				path: ["api", "users", "get"],
				input: { id: "1", proto: "value", constructorName: "test" },
			})
			expect(key).toEqual([
				["api", "users", "get"],
				{ input: { id: "1", proto: "value", constructorName: "test" } },
			])
		})
	})
})

describe("getMutationKey", () => {
	test("generates key from path", () => {
		const key = getMutationKey({ path: ["api", "users", "post"] })
		expect(key).toEqual([["api", "users", "post"]])
	})

	test("handles nested paths", () => {
		const key = getMutationKey({
			path: ["api", "v1", "users", "profile", "update"],
		})
		expect(key).toEqual([["api", "v1", "users", "profile", "update"]])
	})

	test("handles empty path array", () => {
		const key = getMutationKey({ path: [] })
		expect(key).toEqual([[]])
	})
})
