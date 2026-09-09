import { beforeEach, describe, expect, it, vi } from "vitest"

async function createApp() {
	vi.resetModules()
	return (await import("./app")).app
}

function postItem(name: string) {
	return new Request("http://localhost/api/items", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	})
}

describe("Next.js example API", () => {
	let app: Awaited<ReturnType<typeof createApp>>

	beforeEach(async () => {
		app = await createApp()
	})

	it("shares browser writes with subsequent server reads without caching", async () => {
		const name = '</script><img src=x onerror="alert(1)">'
		const created = await app.handle(postItem(`  ${name}  `))
		expect(created.status).toBe(201)
		expect(created.headers.get("Cache-Control")).toBe("no-store")
		const item = await created.json()
		expect(item).toEqual({ id: expect.any(String), name })

		const response = await app.handle(new Request("http://localhost/api/items"))
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(await response.json()).toEqual([
			{ id: "1", name: "Read the SSR guide" },
			{ id: "2", name: "Try a client mutation" },
			item,
		])
	})

	it.each(["", "   ", "x".repeat(121)])(
		"rejects invalid names without changing the list",
		async (name) => {
			const response = await app.handle(postItem(name))
			expect(response.status).toBe(422)
			const list = await app.handle(new Request("http://localhost/api/items"))
			expect(await list.json()).toHaveLength(2)
		},
	)

	it("limits the shared process list to 100 items", async () => {
		for (let index = 0; index < 98; index++) {
			const response = await app.handle(postItem(`Item ${index}`))
			expect(response.status).toBe(201)
		}
		const response = await app.handle(postItem("One too many"))
		expect(response.status).toBe(409)
		const list = await app.handle(new Request("http://localhost/api/items"))
		expect(await list.json()).toHaveLength(100)
	})
})
