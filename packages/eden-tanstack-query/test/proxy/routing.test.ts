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
			// biome-ignore lint/suspicious/noExplicitAny: root-param routing is untyped today
			const eden = createEdenOptionsProxy<any>({ client: client as any })

			// biome-ignore lint/suspicious/noExplicitAny: root-param routing is untyped today
			const options = (eden as any)({ tenant: "t1" }).x.get.queryOptions()

			expect(options.queryKey).toEqual([
				["x", "get"],
				{ input: { tenant: "t1" }, type: "query" },
			])

			const result = await queryClient.fetchQuery(options)
			expect(result).toEqual({ tenant: "t1" })
			expect(hits).toEqual(["/t1/x"])
		})

		test("sequential params at the same path index all reach the URL", async () => {
			hits.length = 0
			const client = treaty(app)
			// biome-ignore lint/suspicious/noExplicitAny: root-param routing is untyped today
			const eden = createEdenOptionsProxy<any>({ client: client as any })

			// biome-ignore lint/suspicious/noExplicitAny: root-param routing is untyped today
			const options = (eden as any)({ tenant: "t1" })({
				locale: "en",
			}).x.get.queryOptions()

			expect(options.queryKey).toEqual([
				["x", "get"],
				{ input: { tenant: "t1", locale: "en" }, type: "query" },
			])

			const result = await queryClient.fetchQuery(options)
			expect(result).toEqual({ tenant: "t1", locale: "en" })
			expect(hits).toEqual(["/t1/en/x"])
		})
	})

	describe("method-named path segments", () => {
		const hits: string[] = []
		const app = new Elysia()
			.onRequest(({ request }) => {
				hits.push(`${request.method} ${new URL(request.url).pathname}`)
			})
			.post("/account/delete", () => ({ via: "post /account/delete" }))
			.delete("/account", () => ({ via: "delete /account" }))
			.get("/settings/options", () => ({ via: "get /settings/options" }))

		test("a segment named after a mutation method is reachable", async () => {
			hits.length = 0
			const client = treaty(app)
			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const eden = createEdenOptionsProxy<any>({ client: client as any })

			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const options = (eden as any).account.delete.post.mutationOptions()
			const result = await options.mutationFn({})

			expect(result).toEqual({ via: "post /account/delete" })
			expect(hits).toEqual(["POST /account/delete"])
		})

		test("the sibling DELETE route never cross-fires", async () => {
			hits.length = 0
			const client = treaty(app)
			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const eden = createEdenOptionsProxy<any>({ client: client as any })

			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const options = (eden as any).account.delete.mutationOptions()
			const result = await options.mutationFn(undefined)

			expect(result).toEqual({ via: "delete /account" })
			expect(hits).toEqual(["DELETE /account"])
		})

		test("a segment named after a query method is reachable", async () => {
			hits.length = 0
			const client = treaty(app)
			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const eden = createEdenOptionsProxy<any>({ client: client as any })

			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const options = (eden as any).settings.options.get.queryOptions()
			const result = await queryClient.fetchQuery(options)

			expect(result).toEqual({ via: "get /settings/options" })
			expect(hits).toEqual(["GET /settings/options"])
		})

		test("procedure members still resolve on method properties", () => {
			const client = treaty(app)
			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const eden = createEdenOptionsProxy<any>({ client: client as any })

			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime routing
			const procedure = (eden as any).settings.options.get
			expect(typeof procedure.queryOptions).toBe("function")
			expect(typeof procedure.queryKey).toBe("function")
			expect("queryOptions" in procedure).toBe(true)
			expect(procedure.then).toBeUndefined()
		})
	})

	describe("procedure object semantics", () => {
		// The procedure node is a proxy so method-named segments stay
		// traversable; it must still behave like the plain object it replaced.
		const app = new Elysia().get("/users", () => [])

		function procedure() {
			const client = treaty(app)
			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime shape
			const eden = createEdenOptionsProxy<any>({ client: client as any })
			// biome-ignore lint/suspicious/noExplicitAny: exercising runtime shape
			return (eden as any).users.get
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

			expect("prototype" in proc).toBe(false)
			expect("queryKey" in proc).toBe(true)
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

			expect(proc.$$typeof).toBeUndefined()
			expect(proc.then).toBeUndefined()
			expect(proc[Symbol.iterator]).toBeUndefined()
			expect(proc.mutationOptions).toBeUndefined()
		})
	})
})
