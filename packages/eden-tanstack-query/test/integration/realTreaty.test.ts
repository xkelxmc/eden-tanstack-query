/**
 * Integration tests against a REAL Eden treaty client.
 *
 * Every other suite substitutes a hand-rolled mock cast to the treaty type,
 * so Eden's actual calling convention — how the proxy's `{ query, headers,
 * fetch }` shape maps onto requests, and the `{ data, error }` envelope —
 * was never exercised. This file drives `treaty(app)` in-process (no
 * network) through `createEdenOptionsProxy` and asserts what the Elysia
 * handlers actually receive.
 */
import { treaty } from "@elysiajs/eden"
import { Elysia, t } from "elysia"

import { createEdenOptionsProxy } from "../../src"
import { createTestQueryClient } from "../../test-utils"

// ============================================================================
// Real Elysia app with request capture
// ============================================================================

interface Captured {
	url?: string
	query?: Record<string, unknown>
	body?: unknown
	signal?: AbortSignal
	slowStarted?: boolean
}

let captured: Captured = {}

const app = new Elysia()
	.get("/hello", () => ({ message: "Hello from Elysia!" }))
	.get(
		"/search",
		({ query, request }) => {
			captured.url = request.url
			captured.query = query
			return { items: [query.q], limit: query.limit ?? null }
		},
		{
			query: t.Object({
				q: t.String(),
				limit: t.Optional(t.Numeric()),
			}),
		},
	)
	.get(
		"/users/:id",
		({ params, request }) => {
			captured.url = request.url
			return { id: params.id, name: `User ${params.id}` }
		},
		{ params: t.Object({ id: t.String() }) },
	)
	.get(
		"/required-cursor",
		({ query, request }) => {
			captured.url = request.url
			captured.query = query
			return { items: [query.cursor], next: query.cursor }
		},
		{ query: t.Object({ cursor: t.String() }) },
	)
	.get(
		"/required-nullable-cursor",
		({ query, request }) => {
			captured.url = request.url
			captured.query = query
			return { items: [query.cursor], next: query.cursor }
		},
		{
			query: t.Object({ cursor: t.Union([t.String(), t.Null()]) }),
		},
	)
	.get(
		"/optional-cursor",
		({ query, request }) => {
			captured.url = request.url
			captured.query = query
			return { items: [query.cursor ?? "first"], next: query.cursor ?? null }
		},
		{ query: t.Object({ cursor: t.Optional(t.String()) }) },
	)
	.post(
		"/users",
		({ body, request }) => {
			captured.url = request.url
			captured.body = body
			return { id: "created", ...body }
		},
		{ body: t.Object({ name: t.String() }) },
	)
	.get("/teapot", ({ status }) => status(418, { message: "i am a teapot" }))
	.get("/no-content", ({ status }) => status(204))
	.get("/reset-content", ({ status }) => status(205, undefined), {
		response: { 205: t.Undefined() },
	})
	.get("/slow", async ({ request }) => {
		captured.signal = request.signal
		captured.slowStarted = true
		await new Promise((resolve) => setTimeout(resolve, 200))
		return { ok: true }
	})

type App = typeof app

// The whole point: a real client, no `as unknown as` cast anywhere.
const client = treaty(app)
const eden = createEdenOptionsProxy<App>({ client })

beforeEach(() => {
	captured = {}
})

async function until(predicate: () => boolean, timeoutMs = 1000) {
	const start = Date.now()
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) {
			throw new Error("timed out waiting for condition")
		}
		await new Promise((resolve) => setTimeout(resolve, 10))
	}
}

// ============================================================================
// Tests
// ============================================================================

describe("real treaty client through the options proxy", () => {
	test("plain GET resolves with the handler's data", async () => {
		const queryClient = createTestQueryClient()

		const data = await queryClient.fetchQuery(eden.hello.get.queryOptions())

		expect(data).toEqual({ message: "Hello from Elysia!" })
	})

	test("GET with query params sends the actual query string", async () => {
		const queryClient = createTestQueryClient()

		const data = await queryClient.fetchQuery(
			eden.search.get.queryOptions({ q: "abc", limit: 5 }),
		)

		expect(data).toEqual({ items: ["abc"], limit: 5 })
		// what the handler actually received, post-validation
		expect(captured.query).toEqual({ q: "abc", limit: 5 })
		// what was actually on the wire
		const url = new URL(captured.url ?? "")
		expect(url.pathname).toBe("/search")
		expect(url.searchParams.get("q")).toBe("abc")
		expect(url.searchParams.get("limit")).toBe("5")
	})

	test("path-param call requests the parameterized URL", async () => {
		const queryClient = createTestQueryClient()

		const data = await queryClient.fetchQuery(
			eden.users({ id: "42" }).get.queryOptions(),
		)

		expect(data).toEqual({ id: "42", name: "User 42" })
		expect(new URL(captured.url ?? "").pathname).toBe("/users/42")
	})

	test("required cursors use an explicit non-null value on the wire", async () => {
		const queryClient = createTestQueryClient()
		const options = eden["required-cursor"].get.infiniteQueryOptions(
			{},
			{
				initialCursor: "start",
				getNextPageParam: (last) => last.next,
			},
		)

		const data = await queryClient.fetchInfiniteQuery(options)

		expect(options.initialPageParam).toBe("start")
		expect(data.pages[0]).toEqual({ items: ["start"], next: "start" })
		expect(captured.query).toEqual({ cursor: "start" })
	})

	test("required nullable cursors still need a non-null wire value", async () => {
		const queryClient = createTestQueryClient()
		const options = eden["required-nullable-cursor"].get.infiniteQueryOptions(
			{},
			{
				initialCursor: "start",
				getNextPageParam: (last) => last.next,
			},
		)

		await queryClient.fetchInfiniteQuery(options)

		expect(captured.query).toEqual({ cursor: "start" })
	})

	test("optional cursors can use the omitted null default", async () => {
		const queryClient = createTestQueryClient()
		const options = eden["optional-cursor"].get.infiniteQueryOptions(
			{},
			{ getNextPageParam: (last) => last.next ?? undefined },
		)

		const data = await queryClient.fetchInfiniteQuery(options)

		expect(options.initialPageParam).toBe(null)
		expect(data.pages[0]).toEqual({ items: ["first"], next: null })
		expect(captured.query).toEqual({})
	})

	test("POST sends the body as-is", async () => {
		const options = eden.users.post.mutationOptions()

		const data = await options.mutationFn({ name: "Ada" })

		expect(data).toEqual({ id: "created", name: "Ada" })
		expect(captured.body).toEqual({ name: "Ada" })
		expect(new URL(captured.url ?? "").pathname).toBe("/users")
	})

	test("non-2xx response rejects with Eden's { status, value } envelope", async () => {
		const queryClient = createTestQueryClient()

		let thrown: unknown
		try {
			await queryClient.fetchQuery(eden.teapot.get.queryOptions())
		} catch (error) {
			thrown = error
		}

		expect(thrown).toBeDefined()
		const edenError = thrown as { status: number; value: unknown }
		expect(edenError.status).toBe(418)
		expect(edenError.value).toEqual({ message: "i am a teapot" })
	})

	test("204 and 205 resolve to Treaty's empty-string data", async () => {
		const queryClient = createTestQueryClient()

		const noContent = await queryClient.fetchQuery(
			eden["no-content"].get.queryOptions(),
		)
		const resetContent = await queryClient.fetchQuery(
			eden["reset-content"].get.queryOptions(),
		)

		expect(noContent).toBe("")
		expect(resetContent).toBe("")
	})

	test("transport failures preserve Treaty's 503 error envelope", async () => {
		const offlineError = new Error("offline")
		const offlineFetcher: typeof fetch = Object.assign(
			async () => {
				throw offlineError
			},
			{ preconnect: fetch.preconnect },
		)
		const offlineClient = treaty<App>("http://offline.invalid", {
			fetcher: offlineFetcher,
		})
		const offlineEden = createEdenOptionsProxy<App>({ client: offlineClient })
		const queryClient = createTestQueryClient()

		await expect(
			queryClient.fetchQuery(offlineEden.hello.get.queryOptions()),
		).rejects.toMatchObject({ status: 503, value: offlineError })
	})

	test("transport failures preserve non-Error rejection values", async () => {
		const offlineValue = "offline-string"
		const offlineFetcher: typeof fetch = Object.assign(
			() => Promise.reject(offlineValue),
			{ preconnect: fetch.preconnect },
		)
		const offlineClient = treaty<App>("http://offline.invalid", {
			fetcher: offlineFetcher,
		})
		const offlineEden = createEdenOptionsProxy<App>({ client: offlineClient })
		const queryClient = createTestQueryClient()

		await expect(
			queryClient.fetchQuery(offlineEden.hello.get.queryOptions()),
		).rejects.toMatchObject({ status: 503, value: offlineValue })
	})

	test("abortOnUnmount forwards the AbortSignal all the way into Eden's request", async () => {
		const queryClient = createTestQueryClient()

		const options = eden.slow.get.queryOptions(undefined, {
			eden: { abortOnUnmount: true },
		})

		const pending = queryClient
			.fetchQuery(options)
			.then(() => "resolved" as const)
			.catch(() => "rejected" as const)

		await until(() => captured.slowStarted === true)
		expect(captured.signal).toBeDefined()
		expect(captured.signal?.aborted).toBe(false)

		await queryClient.cancelQueries({ queryKey: options.queryKey })

		expect(await pending).toBe("rejected")
		// the signal TanStack aborted is the one the Elysia handler saw
		expect(captured.signal?.aborted).toBe(true)
	})

	test("without abortOnUnmount the request is not aborted on cancel", async () => {
		const queryClient = createTestQueryClient()

		const pending = queryClient
			.fetchQuery(eden.slow.get.queryOptions())
			.then(() => "resolved" as const)
			.catch(() => "rejected" as const)

		await until(() => captured.slowStarted === true)
		await queryClient.cancelQueries()

		// TanStack marks the query cancelled either way...
		expect(await pending).toBe("rejected")
		// ...but the underlying request keeps running untouched
		expect(captured.signal?.aborted).toBe(false)
	})
})

describe("proxy hygiene against the real client", () => {
	test("proxy is not a thenable and ignores symbol probes", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: probing runtime trap behavior
		const anyEden = eden as any

		expect(anyEden.then).toBeUndefined()
		expect(anyEden[Symbol.toStringTag]).toBeUndefined()
		expect(anyEden.users[Symbol.iterator]).toBeUndefined()
		// awaiting the proxy must resolve (not hang) because `then` is undefined
		const awaited = await anyEden
		expect(awaited).toBeDefined()
	})
})
