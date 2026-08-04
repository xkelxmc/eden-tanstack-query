/**
 * Strict type-level assertion helpers for tests.
 *
 * `Equals` is invariant — it distinguishes `any`, `unknown` and `never`.
 * Prefer it over one-directional `A extends B ? true : false` checks,
 * which stay green when inference silently degrades to `any`.
 */

export type Equals<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false

export type IsAny<T> = 0 extends 1 & T ? true : false

export type IsNever<T> = [T] extends [never] ? true : false

export type IsUnknown<T> =
	IsAny<T> extends true ? false : unknown extends T ? true : false

/** Compile-time assertion: the type argument must resolve to `true`. */
export function assertType<_T extends true>(): void {}
