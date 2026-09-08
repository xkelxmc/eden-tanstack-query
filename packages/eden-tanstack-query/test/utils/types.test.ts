/**
 * Type tests for utility types in src/utils/types.ts
 *
 * These tests verify type-level behavior at compile time.
 */
import type {
	DeepPartial,
	EmptyToVoid,
	IsAny,
	IsNever,
	IsUnknown,
	Simplify,
} from "../../src/utils/types"
import { assertType, type Equals } from "../../test-utils/type-assert"

// ============================================================================
// IsAny Tests
// ============================================================================

describe("IsAny", () => {
	test("returns true for any", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Testing any detection
		type Result = IsAny<any>
		const result: Result = true
		expect(result).toBe(true)
	})

	test("returns false for string", () => {
		type Result = IsAny<string>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for number", () => {
		type Result = IsAny<number>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for unknown", () => {
		type Result = IsAny<unknown>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for never", () => {
		type Result = IsAny<never>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for object", () => {
		type Result = IsAny<{ foo: string }>
		const result: Result = false
		expect(result).toBe(false)
	})
})

// ============================================================================
// IsNever Tests
// ============================================================================

describe("IsNever", () => {
	test("returns true for never", () => {
		type Result = IsNever<never>
		const result: Result = true
		expect(result).toBe(true)
	})

	test("returns false for string", () => {
		type Result = IsNever<string>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for any", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Testing any vs never
		type Result = IsNever<any>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for unknown", () => {
		type Result = IsNever<unknown>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for void", () => {
		type Result = IsNever<void>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for undefined", () => {
		type Result = IsNever<undefined>
		const result: Result = false
		expect(result).toBe(false)
	})
})

// ============================================================================
// IsUnknown Tests
// ============================================================================

describe("IsUnknown", () => {
	test("returns true for unknown", () => {
		type Result = IsUnknown<unknown>
		const result: Result = true
		expect(result).toBe(true)
	})

	test("returns false for any", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Testing any vs unknown
		type Result = IsUnknown<any>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for string", () => {
		type Result = IsUnknown<string>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for never", () => {
		type Result = IsUnknown<never>
		const result: Result = false
		expect(result).toBe(false)
	})

	test("returns false for object", () => {
		type Result = IsUnknown<{ foo: string }>
		const result: Result = false
		expect(result).toBe(false)
	})
})

// ============================================================================
// Simplify Tests
// ============================================================================

describe("Simplify", () => {
	test("expands intersection types", () => {
		type A = { a: string }
		type B = { b: number }
		type Result = Simplify<A & B>

		// Result should have both properties
		type HasA = "a" extends keyof Result ? true : false
		type HasB = "b" extends keyof Result ? true : false

		const hasA: HasA = true
		const hasB: HasB = true

		expect(hasA).toBe(true)
		expect(hasB).toBe(true)
	})

	test("preserves simple object type", () => {
		type Input = { name: string; age: number }
		type Result = Simplify<Input>

		type HasName = Result extends { name: string } ? true : false
		type HasAge = Result extends { age: number } ? true : false

		const hasName: HasName = true
		const hasAge: HasAge = true

		expect(hasName).toBe(true)
		expect(hasAge).toBe(true)
	})

	test("handles nested objects", () => {
		type Input = { user: { name: string } }
		type Result = Simplify<Input>

		type HasUser = "user" extends keyof Result ? true : false
		const hasUser: HasUser = true
		expect(hasUser).toBe(true)
	})
})

// ============================================================================
// DeepPartial Tests
// ============================================================================

describe("DeepPartial", () => {
	test("makes top-level properties optional", () => {
		type Input = { name: string; age: number }
		type Result = DeepPartial<Input>

		assertType<Equals<Result, { name?: string; age?: number }>>()
	})

	test("makes nested properties optional", () => {
		type Input = { user: { name: string; email: string } }
		type Result = DeepPartial<Input>

		assertType<Equals<Result, { user?: { name?: string; email?: string } }>>()
	})

	test("handles primitive types", () => {
		type Result = DeepPartial<string>
		assertType<Equals<Result, string>>()
	})

	test("handles arrays", () => {
		type Input = { items: string[] }
		type Result = DeepPartial<Input>

		assertType<Equals<Result, { items?: (string | undefined)[] }>>()
		assertType<
			Equals<
				DeepPartial<{ items: { name: string }[] }>,
				{ items?: ({ name?: string } | undefined)[] }
			>
		>()
	})

	test("handles deeply nested objects", () => {
		type Input = {
			level1: {
				level2: {
					level3: { value: string }
				}
			}
		}
		type Result = DeepPartial<Input>

		assertType<
			Equals<Result, { level1?: { level2?: { level3?: { value?: string } } } }>
		>()

		// Should be deeply optional
		const valid: Result = {}
		const alsoValid: Result = { level1: {} }
		const deepValid: Result = { level1: { level2: { level3: {} } } }

		expect(valid).toEqual({})
		expect(alsoValid).toEqual({ level1: {} })
		expect(deepValid).toEqual({ level1: { level2: { level3: {} } } })
	})
})

// ============================================================================
// EmptyToVoid Tests
// ============================================================================

describe("EmptyToVoid", () => {
	test("converts empty object to void | {}", () => {
		// biome-ignore lint/complexity/noBannedTypes: Testing empty object input
		type Result = EmptyToVoid<{}>

		// void should extend Result (making it optional in function args)
		type VoidExtends = void extends Result ? true : false
		const voidExtends: VoidExtends = true
		expect(voidExtends).toBe(true)
	})

	test("keeps non-empty object as is", () => {
		type Input = { name: string }
		type Result = EmptyToVoid<Input>

		// Result should be exactly Input (no void)
		type IsExact = Result extends { name: string } ? true : false
		const isExact: IsExact = true
		expect(isExact).toBe(true)
	})

	test("keeps primitives as is", () => {
		type StringResult = EmptyToVoid<string>
		type NumberResult = EmptyToVoid<number>

		type StringCheck = StringResult extends string ? true : false
		type NumberCheck = NumberResult extends number ? true : false

		const stringCheck: StringCheck = true
		const numberCheck: NumberCheck = true

		expect(stringCheck).toBe(true)
		expect(numberCheck).toBe(true)
	})

	test("handles optional properties correctly", () => {
		type Input = { name?: string }
		type Result = EmptyToVoid<Input>

		// Object with optional property extends {}, so should include void
		type VoidExtends = void extends Result ? true : false
		const voidExtends: VoidExtends = true
		expect(voidExtends).toBe(true)
	})

	test("works with function argument pattern", () => {
		// This is the main use case - making args optional when input is empty
		// biome-ignore lint/complexity/noBannedTypes: Testing function pattern
		type EmptyInput = EmptyToVoid<{}>
		type RequiredInput = EmptyToVoid<{ id: string }>

		// Function with EmptyInput can be called without args
		const fnEmpty = (_input: EmptyInput) => "ok"
		const fnRequired = (_input: RequiredInput) => "ok"
		// @ts-expect-error required input cannot be omitted
		fnRequired()
		expect(fnRequired({ id: "1" })).toBe("ok")

		// Both work
		expect(fnEmpty()).toBe("ok")
		expect(fnEmpty({})).toBe("ok")
	})
})
