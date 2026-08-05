import { treaty } from "@elysiajs/eden"
import { Elysia, t } from "elysia"
import { createEdenOptionsProxy } from "../../src/proxy/createOptionsProxy"
import { createTestQueryClient } from "../../test-utils"

// Routing cases verified against a real in-process Eden treaty client —
// hand-rolled mocks cannot prove which verb and URL actually go out.

describe("proxy routing against a real treaty client", () => {
	const queryClient = createTestQueryClient()

	describe("root-level path params", () => {
		const hits: string[] = []
		const app = new Elysia()
			.onRequest(({ request }) => {
				hits.push(new URL(request.url).pathname)
			})
			.get("/x", () => ({ tenant: null as string | null }))
			.get("/:tenant/x", ({ params }) => ({ tenant: params.tenant }), {
				params: t.Object({ tenant: t.String() }),
			})
			.get(
				"/:tenant/:locale/x",
				({ params }) => ({ tenant: params.tenant, locale: params.locale }),
				{
					params: t.Object({ tenant: t.String(), locale: t.String() }),
				},
			)

		test("params applied on the root proxy reach the URL and the key", async () => {
			hits.length = 0
			const client = treaty(app)
			const eden = createEdenOptionsProxy<typeof app>({ client })

			const options = eden({ tenant: "t1" }).x.get.queryOptions()

			expect(options.queryKey).toEqual([
				["x", "get"],
				{
					pathParams: [{ pathIndex: -1, entries: [["tenant", "t1"]] }],
					type: "query",
				},
			])

			const result = await queryClient.fetchQuery(options)
			expect(result).toEqual({ tenant: "t1" })
			expect(hits).toEqual(["/t1/x"])
		})

		test("sequential params at the same path index all reach the URL", async () => {
			hits.length = 0
			const client = treaty(app)
			const eden = createEdenOptionsProxy<typeof app>({ client })

			const options = eden({ tenant: "t1" })({
				locale: "en",
			}).x.get.queryOptions()

			expect(options.queryKey).toEqual([
				["x", "get"],
				{
					pathParams: [
						{ pathIndex: -1, entries: [["tenant", "t1"]] },
						{ pathIndex: -1, entries: [["locale", "en"]] },
					],
					type: "query",
				},
			])

			const result = await queryClient.fetchQuery(options)
			expect(result).toEqual({ tenant: "t1", locale: "en" })
			expect(hits).toEqual(["/t1/en/x"])
		})

		test("duplicate param names retain each sequential value", async () => {
			const duplicateHits: string[] = []
			const duplicateApp = new Elysia()
				.onRequest(({ request }) => {
					duplicateHits.push(new URL(request.url).pathname)
				})
				.get("/:id/:id/x", ({ request }) => new URL(request.url).pathname)
			const client = treaty(duplicateApp)
			const eden = createEdenOptionsProxy<typeof duplicateApp>({ client })
			const options = eden({ id: "a" })({
				id: "b",
			}).x.get.queryOptions()

			expect(options.queryKey[1]).toEqual({
				pathParams: [
					{ pathIndex: -1, entries: [["id", "a"]] },
					{ pathIndex: -1, entries: [["id", "b"]] },
				],
				type: "query",
			})

			await queryClient.fetchQuery(options)
			expect(duplicateHits).toEqual(["/a/b/x"])
		})
	})

	describe("path parameter cache identity", () => {
		const hits: string[] = []
		const app = new Elysia()
			.onRequest(({ request }) => {
				const url = new URL(request.url)
				hits.push(`${url.pathname}${url.search}`)
			})
			.get("/items/:id/x", ({ params }) => params.id, {
				query: t.Object({ id: t.String() }),
			})
			.get("/users/:id", ({ params }) => params.id)
			.get("/feeds/:cursor/posts", ({ params }) => params.cursor, {
				query: t.Object({
					cursor: t.Optional(t.String()),
					limit: t.Optional(t.Number()),
				}),
			})
			.get(
				"/proto/:__proto__/x",
				({ request }) => new URL(request.url).pathname,
			)

		test("query input cannot overwrite path identity", async () => {
			hits.length = 0
			const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
			const first = eden
				.items({ id: "a" })
				.x.get.queryOptions({ id: "query" }, { staleTime: Infinity })
			const second = eden
				.items({ id: "b" })
				.x.get.queryOptions({ id: "query" }, { staleTime: Infinity })

			expect(first.queryKey).not.toEqual(second.queryKey)
			expect(first.queryKey[1]).toEqual({
				input: { id: "query" },
				pathParams: [{ pathIndex: 0, entries: [["id", "a"]] }],
				type: "query",
			})

			await queryClient.fetchQuery(first)
			await queryClient.fetchQuery(second)
			expect(hits).toEqual(["/items/a/x?id=query", "/items/b/x?id=query"])
		})

		test("captures params before procedure helper creation", async () => {
			hits.length = 0
			const params = { id: "a" }
			const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
			const procedure = eden.users(params).get
			params.id = "b"
			const options = procedure.queryOptions()

			expect(options.queryKey[1]).toEqual({
				pathParams: [{ pathIndex: 0, entries: [["id", "a"]] }],
				type: "query",
			})
			expect(await createTestQueryClient().fetchQuery(options)).toBe("a")
			expect(hits).toEqual(["/users/a"])
		})

		test("keeps captured params after options creation", async () => {
			hits.length = 0
			const params = { id: "c" }
			const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
			const options = eden.users(params).get.queryOptions()
			params.id = "d"

			expect(options.queryKey[1]).toEqual({
				pathParams: [{ pathIndex: 0, entries: [["id", "c"]] }],
				type: "query",
			})
			expect(await createTestQueryClient().fetchQuery(options)).toBe("c")
			expect(hits).toEqual(["/users/c"])
		})

		test("cursor-named path params remain in infinite query keys", async () => {
			hits.length = 0
			const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
			const infiniteOpts = {
				initialCursor: "page",
				getNextPageParam: () => undefined,
			}
			const first = eden
				.feeds({ cursor: "a" })
				.posts.get.infiniteQueryOptions({ limit: 1 }, infiniteOpts)
			const second = eden
				.feeds({ cursor: "b" })
				.posts.get.infiniteQueryOptions({ limit: 1 }, infiniteOpts)

			expect(first.queryKey).not.toEqual(second.queryKey)
			await queryClient.fetchInfiniteQuery({ ...first, staleTime: Infinity })
			await queryClient.fetchInfiniteQuery({ ...second, staleTime: Infinity })
			expect(hits).toEqual([
				"/feeds/a/posts?limit=1&cursor=page",
				"/feeds/b/posts?limit=1&cursor=page",
			])
		})

		test("an own __proto__ path param retains cache identity", () => {
			const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })
			const first = eden
				.proto(JSON.parse('{"__proto__":"a"}'))
				.x.get.queryOptions()
			const second = eden
				.proto(JSON.parse('{"__proto__":"b"}'))
				.x.get.queryOptions()

			expect(first.queryKey).not.toEqual(second.queryKey)
			expect(first.queryKey[1]).toEqual({
				pathParams: [{ pathIndex: 0, entries: [["__proto__", "a"]] }],
				type: "query",
			})
		})
	})

	describe("method-named path segments", () => {
		const hits: string[] = []
		const app = new Elysia()
			.onRequest(({ request }) => {
				hits.push(`${request.method} ${new URL(request.url).pathname}`)
			})
			.post("/account/delete", () => ({ via: "post /account/delete" }))
			.post("/account/delete/:id", ({ params }) => ({ id: params.id }))
			.delete("/account", () => ({ via: "delete /account" }))
			.get("/settings/options", () => ({ via: "get /settings/options" }))

		test("a segment named after a mutation method is reachable", async () => {
			hits.length = 0
			const client = treaty(app)
			const eden = createEdenOptionsProxy<typeof app>({ client })

			const options = eden.account.delete.post.mutationOptions()
			const mutationFn = options.mutationFn
			if (!mutationFn) throw new Error("Expected mutationFn")
			const result = await mutationFn()

			expect(result).toEqual({ via: "post /account/delete" })
			expect(hits).toEqual(["POST /account/delete"])
		})

		test("the sibling DELETE route never cross-fires", async () => {
			hits.length = 0
			const client = treaty(app)
			const eden = createEdenOptionsProxy<typeof app>({ client })

			const options = eden.account.delete.mutationOptions()
			const mutationFn = options.mutationFn
			if (!mutationFn) throw new Error("Expected mutationFn")
			const result = await mutationFn(undefined)

			expect(result).toEqual({ via: "delete /account" })
			expect(hits).toEqual(["DELETE /account"])
		})

		test("a segment named after a query method is reachable", async () => {
			hits.length = 0
			const client = treaty(app)
			const eden = createEdenOptionsProxy<typeof app>({ client })

			const options = eden.settings.options.get.queryOptions()
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual({ via: "get /settings/options" })
			expect(hits).toEqual(["GET /settings/options"])
		})

		test("procedure members still resolve on method properties", () => {
			const client = treaty(app)
			const eden = createEdenOptionsProxy<typeof app>({ client })

			const procedure = eden.settings.options.get
			expect(typeof procedure.queryOptions).toBe("function")
			expect(typeof procedure.queryKey).toBe("function")
			expect("queryOptions" in procedure).toBe(true)
			expect(Reflect.get(procedure, "then")).toBeUndefined()
		})

		test("a method-named procedure stays non-callable", () => {
			const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })

			expect(typeof eden.account.delete).toBe("object")
		})
	})

	describe("host-probe route names", () => {
		const hits: string[] = []
		const app = new Elysia()
			.onRequest(({ request }) => {
				hits.push(new URL(request.url).pathname)
			})
			.get("/toJSON", () => "root")
			.get("/users/toJSON", () => "nested")
			.get("/$$typeof", () => "react-probe")

		test("remain navigable on regular path nodes", async () => {
			hits.length = 0
			const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })

			await queryClient.fetchQuery(eden.toJSON.get.queryOptions())
			await queryClient.fetchQuery(eden.users.toJSON.get.queryOptions())
			await queryClient.fetchQuery(eden.$$typeof.get.queryOptions())

			expect(hits).toEqual(["/toJSON", "/users/toJSON", "/$$typeof"])
		})
	})

	describe("procedure object semantics", () => {
		// The procedure node is a proxy so method-named segments stay
		// traversable; it must still behave like the plain object it replaced.
		const app = new Elysia().get("/users", () => [])

		function procedure() {
			const client = treaty(app)
			const eden = createEdenOptionsProxy<typeof app>({ client })
			return eden.users.get
		}

		test("is enumerable", () => {
			const proc = procedure()
			const members = [
				"queryOptions",
				"queryKey",
				"queryFilter",
				"infiniteQueryOptions",
				"infiniteQueryKey",
				"infiniteQueryFilter",
			]

			expect(Object.keys(proc).sort()).toEqual([...members].sort())
			expect(Object.keys({ ...proc }).sort()).toEqual([...members].sort())
			expect(Object.hasOwn(proc, "queryKey")).toBe(true)
			expect(Object.getOwnPropertyDescriptor(proc, "queryKey")).toBeDefined()
		})

		test("does not violate proxy invariants when probed", () => {
			const proc = procedure()
			const symbol = Symbol("owned")
			Object.defineProperty(proc, symbol, {
				value: "symbol-value",
				configurable: false,
				writable: false,
			})
			// biome-ignore lint/suspicious/noThenProperty: verifies the proxy invariant for an own then property
			Object.defineProperty(proc, "then", {
				value: "then-value",
				configurable: false,
				writable: false,
			})

			expect("prototype" in proc).toBe(false)
			expect("queryKey" in proc).toBe(true)
			expect(Reflect.get(proc, symbol)).toBe("symbol-value")
			expect(Reflect.get(proc, "then")).toBe("then-value")
			for (const key of Object.getOwnPropertyNames(proc)) {
				expect(key in proc).toBe(true)
			}
		})

		test("coerces to a string and serializes like a plain object", () => {
			const proc = procedure()

			expect(typeof proc).toBe("object")
			expect(`${proc}`).toBe("[object Object]")
			expect(JSON.stringify(proc)).toBe("{}")
		})

		test("answers host probes without inventing path segments", () => {
			const proc = procedure()

			expect(Reflect.get(proc, "$$typeof")).toBeUndefined()
			expect(Reflect.get(proc, "toJSON")).toBeUndefined()
			expect(Reflect.get(proc, "then")).toBeUndefined()
			expect(Reflect.get(proc, Symbol.iterator)).toBeUndefined()
			expect(Reflect.get(proc, "mutationOptions")).toBeUndefined()
		})
	})
})
