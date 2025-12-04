import { describe, expect, test } from "bun:test"
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

	test("strips cursor and direction from infinite query input", () => {
		const key = getQueryKey({
			path: ["api", "posts", "get"],
			input: { limit: 10, cursor: "abc", direction: "forward" },
			type: "infinite",
		})
		expect(key).toEqual([
			["api", "posts", "get"],
			{ input: { limit: 10 }, type: "infinite" },
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
