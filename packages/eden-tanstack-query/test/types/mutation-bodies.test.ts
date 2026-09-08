import { treaty } from "@elysiajs/eden"
import { useMutation } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import { createEdenOptionsProxy, edenMutationOptions } from "../../src"
import type { ExtractRoutes } from "../../src/types/infer"
import { createTestQueryClient } from "../../test-utils"
import { assertType, type Equals } from "../../test-utils/type-assert"

const app = new Elysia()
	.post("/required", ({ body }) => body, {
		body: t.Object({ name: t.Optional(t.String()) }),
	})
	.post("/optional", ({ body }) => ({ name: body?.name ?? "anonymous" }), {
		body: t.Optional(t.Object({ name: t.String() })),
	})
	.post("/nullable", ({ body }) => body, {
		body: t.Nullable(t.Object({ name: t.String() })),
	})
	.post("/nullable-optional-fields", ({ body }) => body, {
		body: t.Nullable(t.Object({ name: t.Optional(t.String()) })),
	})
	.post("/null-only", ({ body }) => body, { body: t.Null() })
	.post("/empty", () => ({ ok: true }))
const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
type RequiredBody = { name?: string }
type OptionalVariables = { name: string } | undefined | void
type OptionalProxyVariables = { name?: string } | null | undefined | void

export function useMutationBodyProbe() {
	const required = useMutation(
		eden.required.post.mutationOptions({
			onMutate: (variables) => {
				assertType<Equals<typeof variables, RequiredBody>>()
			},
			onSuccess: (_data, variables) => {
				assertType<Equals<typeof variables, RequiredBody>>()
			},
			onError: (_error, variables) => {
				assertType<Equals<typeof variables, RequiredBody>>()
			},
			onSettled: (_data, _error, variables) => {
				assertType<Equals<typeof variables, RequiredBody>>()
			},
		}),
	)
	required.mutate({})
	required.mutate({ name: "Ada" })
	// @ts-expect-error the body object is required even when every field is optional
	required.mutate()
	// @ts-expect-error undefined cannot replace a required body
	required.mutate(undefined)
	// @ts-expect-error mutateAsync also requires the body
	required.mutateAsync()
	// @ts-expect-error field types remain enforced
	required.mutate({ name: 1 })

	const optional = useMutation(
		eden.optional.post.mutationOptions({
			onMutate: (variables) => {
				assertType<Equals<typeof variables, OptionalProxyVariables>>()
			},
			onSuccess: (_data, variables) => {
				assertType<Equals<typeof variables, OptionalProxyVariables>>()
			},
			onError: (_error, variables) => {
				assertType<Equals<typeof variables, OptionalProxyVariables>>()
			},
			onSettled: (_data, _error, variables) => {
				assertType<Equals<typeof variables, OptionalProxyVariables>>()
			},
		}),
	)
	optional.mutate()
	optional.mutate(undefined)
	optional.mutate({ name: "Ada" })
	optional.mutateAsync()
	optional.mutate({})
	// @ts-expect-error optional fields still enforce their value type
	optional.mutate({ name: 1 })

	const empty = useMutation(
		eden.empty.post.mutationOptions({
			onMutate: (variables) => {
				assertType<Equals<typeof variables, undefined | void>>()
			},
		}),
	)
	empty.mutate()
	empty.mutate(undefined)

	const nullable = useMutation(eden.nullable.post.mutationOptions())
	nullable.mutate(null)
	nullable.mutate({ name: "Ada" })
	// @ts-expect-error nullable does not make a required body optional
	nullable.mutate()
	// @ts-expect-error nullable bodies do not accept undefined
	nullable.mutate(undefined)
	const nullOnly = useMutation(eden["null-only"].post.mutationOptions())
	nullOnly.mutate(null)
	// @ts-expect-error a required null body still needs an argument
	nullOnly.mutate()
}

export function useStandaloneMutationBodyProbe() {
	const required = useMutation(
		edenMutationOptions({
			path: ["required", "post"],
			mutate: async (body: RequiredBody) => body,
			opts: {
				onMutate: (variables) => {
					assertType<Equals<typeof variables, RequiredBody>>()
				},
			},
		}),
	)
	required.mutate({})
	// @ts-expect-error optional fields do not make the standalone body optional
	required.mutate()
	// @ts-expect-error undefined cannot replace the standalone required body
	required.mutate(undefined)

	const optional = useMutation(
		edenMutationOptions({
			path: ["optional", "post"],
			mutate: async (body: { name: string } | undefined) => body,
			opts: {
				onMutate: (variables) => {
					assertType<Equals<typeof variables, OptionalVariables>>()
				},
				onSuccess: (_data, variables) => {
					assertType<Equals<typeof variables, OptionalVariables>>()
				},
				onError: (_error, variables) => {
					assertType<Equals<typeof variables, OptionalVariables>>()
				},
				onSettled: (_data, _error, variables) => {
					assertType<Equals<typeof variables, OptionalVariables>>()
				},
			},
		}),
	)
	optional.mutate()
	optional.mutate(undefined)
	optional.mutate({ name: "Ada" })
	// @ts-expect-error a present body must contain name
	optional.mutate({})

	const empty = useMutation(
		edenMutationOptions({
			path: ["empty", "post"],
			mutate: async (_body: undefined) => ({ ok: true }),
			opts: {
				onMutate: (variables) => {
					assertType<Equals<typeof variables, undefined | void>>()
				},
			},
		}),
	)
	empty.mutate()
	empty.mutate(undefined)
}

export function mutationFunctionBodyProbe() {
	const required = eden.required.post.mutationOptions()
	required.mutationFn({})
	// @ts-expect-error direct mutation functions must also require the body
	required.mutationFn()
	// @ts-expect-error undefined cannot replace the direct body
	required.mutationFn(undefined)
	const optional = eden.optional.post.mutationOptions()
	optional.mutationFn()
	optional.mutationFn(undefined)
	eden.empty.post.mutationOptions().mutationFn()
}

describe("mutation body contracts", () => {
	test("Elysia exposes the same body type for optional and nullable objects", async () => {
		type Routes = ExtractRoutes<typeof app>
		assertType<
			Equals<
				Routes["optional"]["post"]["body"],
				Routes["nullable-optional-fields"]["post"]["body"]
			>
		>()
		await expect(
			eden["nullable-optional-fields"].post.mutationOptions().mutationFn(),
		).resolves.toEqual({})
	})

	test("Treaty accepts an empty required object and omitted optional bodies", async () => {
		await expect(
			eden.required.post.mutationOptions().mutationFn({}),
		).resolves.toEqual({})
		await expect(
			eden.optional.post.mutationOptions().mutationFn(),
		).resolves.toEqual({ name: "anonymous" })
		await expect(
			eden.empty.post.mutationOptions().mutationFn(),
		).resolves.toEqual({ ok: true })
	})

	test("standalone callbacks receive omitted variables unchanged", async () => {
		const queryClient = createTestQueryClient()
		const received: unknown[] = []
		const options = edenMutationOptions({
			path: ["optional", "post"],
			mutate: async (body: { name: string } | undefined) => {
				received.push(body)
				return "done"
			},
			opts: {
				onMutate: (variables) => {
					received.push(variables)
				},
				onSuccess: (_data, variables) => {
					received.push(variables)
				},
				onSettled: (_data, _error, variables) => {
					received.push(variables)
				},
			},
		})
		await queryClient
			.getMutationCache()
			.build(queryClient, options)
			.execute(undefined)
		expect(received).toEqual([undefined, undefined, undefined, undefined])
	})
})
