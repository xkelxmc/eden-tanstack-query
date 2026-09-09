import { expect, test } from "vitest"
import { app } from "./app"

test("rejects additions at capacity without changing the stored list", async () => {
	const list = () => app.handle(new Request("http://localhost/api/items"))
	const add = (name: string) =>
		app.handle(
			new Request("http://localhost/api/items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			}),
		)

	const initial = await (await list()).json()
	for (let index = initial.length; index < 100; index++) {
		const response = await add(`Item ${index}`)
		expect(response.status).toBe(201)
	}
	const full = await (await list()).json()
	expect(full).toHaveLength(100)
	for (let index = 0; index < 3; index++) {
		const response = await add("Overflow")
		expect(response.status).toBe(409)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(await response.json()).toEqual({
			message: "The demo list is full. Restart the server to reset it.",
		})
	}
	expect(await (await list()).json()).toEqual(full)
})
