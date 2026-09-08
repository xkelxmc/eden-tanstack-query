import { treaty } from "@elysiajs/eden"
import { Elysia, form } from "elysia"

import { createEdenOptionsProxy } from "../../src"
import type {
	ExtractRoutes,
	InferRouteError,
	InferRouteOutput,
	InferRouteOutputAll,
} from "../../src/types/infer"
import { createTestQueryClient } from "../../test-utils"
import { assertType, type Equals } from "../../test-utils/type-assert"

const app = new Elysia()
	.get("/form", () => form({ name: "Ada" }))
	.get("/form-error", ({ status }) => status(422, form({ message: "invalid" })))
	.get(
		"/readable",
		() =>
			new ReadableStream<string>({
				start(controller) {
					controller.enqueue("hello")
					controller.close()
				},
			}),
	)
	// biome-ignore lint/correctness/useYield: exercises a generator returning before streaming starts.
	.get("/sync-return", function* () {
		return "finished"
	})
	// biome-ignore lint/correctness/useYield: exercises an async generator returning before streaming starts.
	.get("/async-return", async function* () {
		return "finished"
	})
	// biome-ignore lint/correctness/useYield: exercises form parsing after an immediate generator return.
	.get("/sync-form", function* () {
		return form({ name: "Ada" })
	})
	// biome-ignore lint/correctness/useYield: exercises form parsing after an immediate async generator return.
	.get("/async-form", async function* () {
		return form({ name: "Ada" })
	})
	.get("/sync-mixed", function* ({ query }) {
		if (query.early) return "finished"
		yield "hello"
		return "finished"
	})
	.get("/async-mixed", async function* ({ query }) {
		if (query.early) return "finished"
		yield "hello"
		return "finished"
	})
	.get("/sync-empty", function* ({ query }) {
		if (query.early) return
		yield "hello"
	})
	.get("/async-empty", async function* ({ query }) {
		if (query.early) return
		yield "hello"
	})
	// biome-ignore lint/correctness/useYield: exercises an empty response before streaming starts.
	.get("/sync-empty-return", function* () {
		return
	})
	// biome-ignore lint/correctness/useYield: exercises an empty response before streaming starts.
	.get("/async-empty-return", async function* () {
		return
	})

type Routes = ExtractRoutes<typeof app>
const eden = createEdenOptionsProxy<typeof app>({ client: treaty(app) })

describe("response transport normalization", () => {
	test("form values are unwrapped for output, errors, and all responses", async () => {
		assertType<
			Equals<InferRouteOutput<Routes["form"]["get"]>, { readonly name: "Ada" }>
		>()
		assertType<
			Equals<
				InferRouteOutputAll<Routes["form"]["get"]>[200],
				{ readonly name: "Ada" }
			>
		>()
		assertType<
			Equals<
				Extract<
					InferRouteError<Routes["form-error"]["get"]>,
					{ status: 422 }
				>["value"],
				{ readonly message: "invalid" }
			>
		>()
		assertType<
			Equals<
				InferRouteOutputAll<Routes["form-error"]["get"]>[422],
				{ readonly message: "invalid" }
			>
		>()
		const queryClient = createTestQueryClient()
		expect(await queryClient.fetchQuery(eden.form.get.queryOptions())).toEqual({
			name: "Ada",
		})
		await expect(
			queryClient.fetchQuery(eden["form-error"].get.queryOptions()),
		).rejects.toMatchObject({ status: 422, value: { message: "invalid" } })
	})

	test("generator-returned forms are parsed after resolving the return value", async () => {
		assertType<
			Equals<
				InferRouteOutput<Routes["sync-form"]["get"]>,
				{ readonly name: "Ada" }
			>
		>()
		assertType<
			Equals<
				InferRouteOutput<Routes["async-form"]["get"]>,
				{ readonly name: "Ada" }
			>
		>()
		const queryClient = createTestQueryClient()
		for (const route of [eden["sync-form"], eden["async-form"]]) {
			expect(await queryClient.fetchQuery(route.get.queryOptions())).toEqual({
				name: "Ada",
			})
		}
	})

	test("ReadableStream becomes an async generator", async () => {
		assertType<
			Equals<
				InferRouteOutput<Routes["readable"]["get"]>,
				AsyncGenerator<string, void, unknown>
			>
		>()
		const stream = await createTestQueryClient().fetchQuery(
			eden.readable.get.queryOptions(),
		)
		expect(await stream.next()).toEqual({ done: false, value: "hello" })
		expect(await stream.next()).toEqual({ done: true, value: undefined })
	})

	test("generators returning before any yield resolve their return value", async () => {
		assertType<Equals<InferRouteOutput<Routes["sync-return"]["get"]>, string>>()
		assertType<
			Equals<InferRouteOutput<Routes["async-return"]["get"]>, string>
		>()
		const queryClient = createTestQueryClient()
		expect(
			await queryClient.fetchQuery(eden["sync-return"].get.queryOptions()),
		).toBe("finished")
		expect(
			await queryClient.fetchQuery(eden["async-return"].get.queryOptions()),
		).toBe("finished")
	})

	test("mixed generators support early returns and streamed values", async () => {
		assertType<
			Equals<
				InferRouteOutput<Routes["sync-mixed"]["get"]>,
				AsyncGenerator<string, void, unknown> | string
			>
		>()
		assertType<
			Equals<
				InferRouteOutput<Routes["async-mixed"]["get"]>,
				AsyncGenerator<string, void, unknown> | string
			>
		>()
		const queryClient = createTestQueryClient()
		for (const route of [eden["sync-mixed"], eden["async-mixed"]]) {
			expect(
				await queryClient.fetchQuery(route.get.queryOptions({ early: "yes" })),
			).toBe("finished")
			const stream = await queryClient.fetchQuery(route.get.queryOptions())
			if (typeof stream === "string")
				throw new Error("Expected streamed response")
			expect(await stream.next()).toEqual({ done: false, value: "hello" })
			expect(await stream.next()).toEqual({ done: true, value: undefined })
		}
	})

	test("empty generator returns decode to an empty string", async () => {
		assertType<
			Equals<InferRouteOutput<Routes["sync-empty-return"]["get"]>, "">
		>()
		assertType<
			Equals<InferRouteOutput<Routes["async-empty-return"]["get"]>, "">
		>()
		assertType<
			Equals<
				InferRouteOutput<Routes["sync-empty"]["get"]>,
				AsyncGenerator<string, void, unknown> | ""
			>
		>()
		assertType<
			Equals<
				InferRouteOutput<Routes["async-empty"]["get"]>,
				AsyncGenerator<string, void, unknown> | ""
			>
		>()
		const queryClient = createTestQueryClient()
		for (const route of [
			eden["sync-empty-return"],
			eden["async-empty-return"],
		]) {
			expect(await queryClient.fetchQuery(route.get.queryOptions())).toBe("")
		}
		for (const route of [eden["sync-empty"], eden["async-empty"]]) {
			expect(
				await queryClient.fetchQuery(route.get.queryOptions({ early: "yes" })),
			).toBe("")
			const stream = await queryClient.fetchQuery(route.get.queryOptions())
			if (typeof stream === "string")
				throw new Error("Expected streamed response")
			expect(await stream.next()).toEqual({ done: false, value: "hello" })
			expect(await stream.next()).toEqual({ done: true, value: undefined })
		}
	})
})
