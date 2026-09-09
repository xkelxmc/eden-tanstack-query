import { treaty } from "@elysiajs/eden"
import { useMutation } from "@tanstack/react-query"
import { Elysia, t } from "elysia"

import { createEdenOptionsProxy } from "../../src"
import { createTestQueryClient } from "../../test-utils"
import { assertType, type Equals } from "../../test-utils/type-assert"

const app = new Elysia()
	.post(
		"/projects/:id/jobs",
		({ body, query, headers, params, request }) => ({
			id: params.id,
			name: body.name,
			dryRun: query.dryRun,
			key: headers["idempotency-key"],
			url: new URL(request.url).pathname + new URL(request.url).search,
		}),
		{
			body: t.Object({ name: t.String() }),
			query: t.Object({ dryRun: t.Union([t.Literal("yes"), t.Literal("no")]) }),
			headers: t.Object({ "idempotency-key": t.String() }),
		},
	)
	.post("/required", ({ body }) => body, {
		body: t.Object({ name: t.Optional(t.String()) }),
	})
	.post("/optional", ({ body }) => ({ name: body?.name ?? "anonymous" }), {
		body: t.Optional(t.Object({ name: t.String() })),
	})
	.post("/empty", () => ({ ok: true }))
	.post(
		"/optionalHeaders",
		({ headers }) => ({ trace: headers["x-trace"] ?? null }),
		{
			headers: t.Object({ "x-trace": t.Optional(t.String()) }),
		},
	)
	.post("/queryOnly", ({ query }) => query, {
		query: t.Object({ token: t.String() }),
	})
	.post("/headersOnly", ({ headers }) => headers["idempotency-key"], {
		headers: t.Object({ "idempotency-key": t.String() }),
	})
	.post("/legacy", ({ body }) => body, {
		body: t.Object({
			request: t.Boolean(),
			body: t.String(),
			query: t.String(),
			headers: t.String(),
		}),
	})
const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
const jobs = eden.projects({ id: "project-42" }).jobs.post

type JobVariables = {
	body: { name: string }
	query: { dryRun: "yes" | "no" }
	headers: { "idempotency-key": string }
}
const variables: JobVariables = {
	body: { name: "ship" },
	query: { dryRun: "yes" },
	headers: { "idempotency-key": "job-123" },
}

export function useMutationRequestProbe() {
	const requestOptions = { request: true } satisfies { request: true }
	const extracted = useMutation(jobs.mutationOptions(requestOptions))
	extracted.mutate(variables)
	// @ts-expect-error extracted request options still require the request envelope
	extracted.mutate(variables.body)
	const widenedOptions = { request: true }
	// @ts-expect-error a boolean cannot determine the mutation variable format
	jobs.mutationOptions(widenedOptions)

	const mutation = useMutation(
		jobs.mutationOptions({
			request: true,
			onMutate: (input) => {
				assertType<Equals<typeof input, JobVariables>>()
				return { previous: input.body.name }
			},
			onSuccess: (data, input, context) => {
				assertType<Equals<typeof input, JobVariables>>()
				assertType<Equals<typeof data.name, string>>()
				assertType<Equals<typeof context, { previous: string }>>()
			},
			onError: (_error, input, context) => {
				assertType<Equals<typeof input, JobVariables>>()
				assertType<Equals<typeof context, { previous: string } | undefined>>()
			},
			onSettled: (_data, _error, input, context) => {
				assertType<Equals<typeof input, JobVariables>>()
				assertType<Equals<typeof context, { previous: string } | undefined>>()
			},
		}),
	)
	mutation.mutate(variables)
	mutation.mutateAsync(variables)
	// @ts-expect-error request mode requires variables for this route
	mutation.mutate()
	// @ts-expect-error the query is required
	mutation.mutate({ body: variables.body, headers: variables.headers })
	// @ts-expect-error the idempotency header is required
	mutation.mutate({ body: variables.body, query: variables.query })
	// @ts-expect-error the body is required
	mutation.mutate({ query: variables.query, headers: variables.headers })
	// @ts-expect-error query literals remain constrained
	mutation.mutate({ ...variables, query: { dryRun: "maybe" } })
	// @ts-expect-error header values remain constrained
	mutation.mutate({ ...variables, headers: { "idempotency-key": 123 } })
	// @ts-expect-error body fields remain constrained
	mutation.mutate({ ...variables, body: { name: 123 } })
	// @ts-expect-error path parameters belong on the bound proxy
	mutation.mutate({ ...variables, params: { id: "other" } })

	const required = useMutation(
		eden.required.post.mutationOptions({ request: true }),
	)
	required.mutate({ body: {} })
	// @ts-expect-error optional fields do not make the body optional
	required.mutate({})
	// @ts-expect-error undefined cannot replace a required body
	required.mutate({ body: undefined })
	const optional = useMutation(
		eden.optional.post.mutationOptions({ request: true }),
	)
	optional.mutate()
	optional.mutate({})
	optional.mutate({ body: { name: "Ada" } })
	const empty = useMutation(eden.empty.post.mutationOptions({ request: true }))
	empty.mutate()
	empty.mutate({})
	// @ts-expect-error a bodyless endpoint cannot receive a body
	empty.mutate({ body: { name: "Ada" } })
	const optionalHeaders = useMutation(
		eden.optionalHeaders.post.mutationOptions({ request: true }),
	)
	optionalHeaders.mutate()
	optionalHeaders.mutate({ headers: {} })
	optionalHeaders.mutate({ headers: { "x-trace": "trace-1" } })
	// @ts-expect-error optional header values remain constrained
	optionalHeaders.mutate({ headers: { "x-trace": 123 } })
	const queryOnly = useMutation(
		eden.queryOnly.post.mutationOptions({ request: true }),
	)
	queryOnly.mutate({ query: { token: "abc" } })
	// @ts-expect-error a bodyless endpoint still requires its declared query
	queryOnly.mutate()
	const headersOnly = useMutation(
		eden.headersOnly.post.mutationOptions({ request: true }),
	)
	headersOnly.mutate({ headers: { "idempotency-key": "abc" } })
	// @ts-expect-error a bodyless endpoint still requires its declared headers
	headersOnly.mutate({})

	type LegacyOptions = ReturnType<typeof jobs.mutationOptions>
	assertType<
		Equals<Parameters<LegacyOptions["mutationFn"]>[0], { name: string }>
	>()
	const legacy = useMutation(eden.legacy.post.mutationOptions())
	legacy.mutate({
		request: true,
		body: "body",
		query: "query",
		headers: "headers",
	})
}

describe("mutation request variables with real Treaty", () => {
	test("preserves configured Treaty headers when request headers are omitted", async () => {
		const configured = createEdenOptionsProxy<typeof app>({
			client: treaty(app, { headers: { "x-trace": "global-trace" } }),
		})
		const options = configured.optionalHeaders.post.mutationOptions({
			request: true,
		})
		await expect(options.mutationFn()).resolves.toEqual({
			trace: "global-trace",
		})
		await expect(options.mutationFn({})).resolves.toEqual({
			trace: "global-trace",
		})
		await expect(
			options.mutationFn({ headers: { "x-trace": "local-trace" } }),
		).resolves.toEqual({ trace: "local-trace" })
	})
	test("sends required body, query and headers to a bound dynamic route", async () => {
		const data = await jobs
			.mutationOptions({ request: true })
			.mutationFn(variables)
		expect(data).toEqual({
			id: "project-42",
			name: "ship",
			dryRun: "yes",
			key: "job-123",
			url: "/projects/project-42/jobs?dryRun=yes",
		})
	})

	test("preserves request variables and inferred context through mutation callbacks", async () => {
		const queryClient = createTestQueryClient()
		const received: unknown[] = []
		const context = { previous: "draft" }
		const options = jobs.mutationOptions({
			request: true,
			onMutate: (input) => {
				received.push(input)
				return context
			},
			onSuccess: (_data, input, result) => {
				received.push(input, result)
			},
			onSettled: (_data, _error, input, result) => {
				received.push(input, result)
			},
		})
		await queryClient
			.getMutationCache()
			.build(queryClient, options)
			.execute(variables)
		expect(received).toEqual([
			variables,
			variables,
			context,
			variables,
			context,
		])
		expect(received[0]).toBe(variables)
		expect(received[1]).toBe(variables)
		expect(received[2]).toBe(context)
	})

	test("supports omitted bodies while forwarding query-only and header-only requests", async () => {
		await expect(
			eden.required.post
				.mutationOptions({ request: true })
				.mutationFn({ body: {} }),
		).resolves.toEqual({})
		await expect(
			eden.optional.post.mutationOptions({ request: true }).mutationFn(),
		).resolves.toEqual({ name: "anonymous" })
		await expect(
			eden.empty.post.mutationOptions({ request: true }).mutationFn({}),
		).resolves.toEqual({ ok: true })
		await expect(
			eden.queryOnly.post
				.mutationOptions({ request: true })
				.mutationFn({ query: { token: "abc" } }),
		).resolves.toEqual({ token: "abc" })
		await expect(
			eden.headersOnly.post
				.mutationOptions({ request: true })
				.mutationFn({ headers: { "idempotency-key": "abc" } }),
		).resolves.toBe("abc")
	})

	test("keeps legacy bodies with request-shaped field names intact", async () => {
		const body = {
			request: true,
			body: "body",
			query: "query",
			headers: "headers",
		}
		await expect(
			eden.legacy.post.mutationOptions().mutationFn(body),
		).resolves.toEqual(body)
		await expect(
			eden.legacy.post.mutationOptions({ request: false }).mutationFn(body),
		).resolves.toEqual(body)
		await expect(
			eden.legacy.post.mutationOptions({ request: true }).mutationFn({ body }),
		).resolves.toEqual(body)
	})
})
