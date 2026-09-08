/**
 * Self-tests for the strict type-assertion helpers.
 *
 * These prove the helpers catch exactly the degradations the vacuous
 * `A extends B` pattern misses: collapse to `any`, `unknown` and `never`.
 */
import type {
	Equals,
	IsAny,
	IsNever,
	IsUnknown,
} from "../../test-utils/type-assert"
import { assertType } from "../../test-utils/type-assert"

describe("Equals", () => {
	test("is true only for identical types", () => {
		assertType<Equals<never, never>>()
		assertType<Equals<unknown, unknown>>()
		assertType<Equals<any, any>>()
		assertType<Equals<{ a: 1 }, { a: 1 }>>()
		assertType<Equals<string | number, number | string>>()
	})

	test("distinguishes any, unknown and never", () => {
		assertType<Equals<Equals<any, { x: 1 }>, false>>()
		assertType<Equals<Equals<unknown, any>, false>>()
		assertType<Equals<Equals<never, any>, false>>()
		assertType<Equals<Equals<never, unknown>, false>>()
		assertType<Equals<Equals<any, string>, false>>()
	})

	test("rejects near-misses that pass one-directional extends checks", () => {
		// Assignability does not distinguish any from unknown.
		// @ts-expect-error any is not equal to unknown
		assertType<Equals<any, unknown>>()
		// @ts-expect-error subtype is not equality
		assertType<Equals<{ a: 1; b: 2 }, { a: 1 }>>()
		// @ts-expect-error optionality matters
		assertType<Equals<{ a?: 1 }, { a: 1 }>>()
	})
})

describe("IsAny / IsNever / IsUnknown", () => {
	test("classify the three degenerate types precisely", () => {
		assertType<Equals<IsAny<any>, true>>()
		assertType<Equals<IsAny<unknown>, false>>()
		assertType<Equals<IsAny<never>, false>>()

		assertType<Equals<IsNever<never>, true>>()
		assertType<Equals<IsNever<any>, false>>()
		assertType<Equals<IsNever<unknown>, false>>()

		assertType<Equals<IsUnknown<unknown>, true>>()
		assertType<Equals<IsUnknown<any>, false>>()
		assertType<Equals<IsUnknown<never>, false>>()
		assertType<Equals<IsUnknown<{ a: 1 }>, false>>()
	})
})
