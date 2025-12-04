/**
 * Query Key type tests for Eden TanStack Query
 *
 * These tests verify that query key types correctly represent
 * the key structure compatible with TanStack Query.
 */
import { describe, expect, test } from "bun:test"

import type {
	EdenMutationKey,
	EdenQueryKey,
	EdenQueryKeyMeta,
	QueryType,
} from "../../src/keys/types"

// ============================================================================
// QueryType Tests
// ============================================================================

describe("QueryType", () => {
	test("includes 'query' type", () => {
		const queryType: QueryType = "query"
		expect(queryType).toBe("query")
	})

	test("includes 'infinite' type", () => {
		const infiniteType: QueryType = "infinite"
		expect(infiniteType).toBe("infinite")
	})

	test("includes 'any' type for filtering", () => {
		const anyType: QueryType = "any"
		expect(anyType).toBe("any")
	})
})

// ============================================================================
// EdenQueryKeyMeta Tests
// ============================================================================

describe("EdenQueryKeyMeta", () => {
	test("can have optional input", () => {
		const meta: EdenQueryKeyMeta = {}
		expect(meta.input).toBeUndefined()

		const metaWithInput: EdenQueryKeyMeta = { input: { id: "123" } }
		expect(metaWithInput.input).toEqual({ id: "123" })
	})

	test("can have optional type", () => {
		const meta: EdenQueryKeyMeta = {}
		expect(meta.type).toBeUndefined()

		const metaWithType: EdenQueryKeyMeta = { type: "query" }
		expect(metaWithType.type).toBe("query")
	})

	test("type excludes 'any'", () => {
		type MetaType = EdenQueryKeyMeta["type"]
		type ExcludesAny = "any" extends MetaType ? false : true
		const excludesAny: ExcludesAny = true
		expect(excludesAny).toBe(true)
	})

	test("is generic over input type", () => {
		type TypedMeta = EdenQueryKeyMeta<{ userId: string; limit: number }>
		type InputType = TypedMeta["input"]

		// Input should be typed
		type IsTyped = InputType extends
			| { userId: string; limit: number }
			| undefined
			? true
			: false
		const isTyped: IsTyped = true
		expect(isTyped).toBe(true)
	})

	test("can combine input and type", () => {
		const meta: EdenQueryKeyMeta<{ cursor?: string }> = {
			input: { cursor: "abc" },
			type: "infinite",
		}
		expect(meta.input).toEqual({ cursor: "abc" })
		expect(meta.type).toBe("infinite")
	})
})

// ============================================================================
// EdenQueryKey Tests
// ============================================================================

describe("EdenQueryKey", () => {
	test("can be path-only (tuple with single element)", () => {
		const key: EdenQueryKey = [["users", "get"]]
		expect(key[0]).toEqual(["users", "get"])
		expect(key.length).toBe(1)
	})

	test("can include metadata (tuple with two elements)", () => {
		const key: EdenQueryKey = [["users", "get"], { input: { id: "1" } }]
		expect(key[0]).toEqual(["users", "get"])
		expect(key[1]).toEqual({ input: { id: "1" } })
	})

	test("path is always string array", () => {
		type Path = EdenQueryKey[0]
		type IsStringArray = Path extends string[] ? true : false
		const isStringArray: IsStringArray = true
		expect(isStringArray).toBe(true)
	})

	test("metadata is optional", () => {
		// Path-only key
		const keyPathOnly: EdenQueryKey = [["api", "users"]]
		expect(keyPathOnly.length).toBe(1)

		// Key with metadata
		const keyWithMeta: EdenQueryKey = [["api", "users"], { input: {} }]
		expect(keyWithMeta.length).toBe(2)
	})

	test("is generic over input type", () => {
		type UserInput = { userId: string; includeProfile: boolean }
		const key: EdenQueryKey<UserInput> = [
			["users", "get"],
			{ input: { userId: "123", includeProfile: true } },
		]
		expect(key[1]?.input).toEqual({ userId: "123", includeProfile: true })
	})

	test("can represent infinite query key", () => {
		const key: EdenQueryKey = [
			["posts", "list"],
			{ input: { limit: 10 }, type: "infinite" },
		]
		expect(key[0]).toEqual(["posts", "list"])
		expect(key[1]?.type).toBe("infinite")
	})

	test("supports deep path nesting", () => {
		const key: EdenQueryKey = [["api", "v1", "users", "profile", "get"]]
		expect(key[0]).toEqual(["api", "v1", "users", "profile", "get"])
	})
})

// ============================================================================
// EdenMutationKey Tests
// ============================================================================

describe("EdenMutationKey", () => {
	test("is always path-only", () => {
		const key: EdenMutationKey = [["users", "post"]]
		expect(key[0]).toEqual(["users", "post"])
		expect(key.length).toBe(1)
	})

	test("has exactly one element (path array)", () => {
		type KeyLength = EdenMutationKey["length"]
		type IsOne = KeyLength extends 1 ? true : false
		const isOne: IsOne = true
		expect(isOne).toBe(true)
	})

	test("path is string array", () => {
		type Path = EdenMutationKey[0]
		type IsStringArray = Path extends string[] ? true : false
		const isStringArray: IsStringArray = true
		expect(isStringArray).toBe(true)
	})

	test("supports different mutation methods", () => {
		const postKey: EdenMutationKey = [["users", "post"]]
		const putKey: EdenMutationKey = [["users", "123", "put"]]
		const deleteKey: EdenMutationKey = [["users", "123", "delete"]]
		const patchKey: EdenMutationKey = [["users", "123", "patch"]]

		expect(postKey[0]).toContain("post")
		expect(putKey[0]).toContain("put")
		expect(deleteKey[0]).toContain("delete")
		expect(patchKey[0]).toContain("patch")
	})
})

// ============================================================================
// TanStack Query Compatibility Tests
// ============================================================================

describe("TanStack Query Compatibility", () => {
	test("EdenQueryKey is a valid tuple type", () => {
		// TanStack Query accepts readonly unknown[] as QueryKey
		type QueryKey = readonly unknown[]
		type IsCompatible = EdenQueryKey extends QueryKey ? true : false
		const isCompatible: IsCompatible = true
		expect(isCompatible).toBe(true)
	})

	test("EdenMutationKey is a valid tuple type", () => {
		type MutationKey = readonly unknown[]
		type IsCompatible = EdenMutationKey extends MutationKey ? true : false
		const isCompatible: IsCompatible = true
		expect(isCompatible).toBe(true)
	})

	test("keys can be used in array operations", () => {
		const key: EdenQueryKey = [["users", "get"], { input: { id: "1" } }]

		// Destructuring works
		const [path, meta] = key
		expect(path).toEqual(["users", "get"])
		expect(meta).toEqual({ input: { id: "1" } })
	})

	test("path-only keys work with partial matching", () => {
		const fullKey: EdenQueryKey = [["users", "get"], { input: { id: "1" } }]
		const filterKey: EdenQueryKey = [["users", "get"]]

		// First element (path) can be compared
		expect(fullKey[0]).toEqual(filterKey[0])
	})
})

// ============================================================================
// Usage Example Tests
// ============================================================================

describe("Usage Examples", () => {
	test("simple key creation", () => {
		const key1: EdenQueryKey = [["api", "users", "get"]]
		expect(key1).toEqual([["api", "users", "get"]])
	})

	test("key with input", () => {
		const key2: EdenQueryKey<{ id: string }> = [
			["api", "users", "get"],
			{ input: { id: "1" } },
		]
		expect(key2).toEqual([["api", "users", "get"], { input: { id: "1" } }])
	})

	test("key with type", () => {
		const key3: EdenQueryKey = [
			["api", "posts", "get"],
			{ input: { limit: 10 }, type: "infinite" },
		]
		expect(key3[1]?.type).toBe("infinite")
	})

	test("mutation key", () => {
		const mutKey: EdenMutationKey = [["api", "users", "post"]]
		expect(mutKey).toEqual([["api", "users", "post"]])
	})
})
