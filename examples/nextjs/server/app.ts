import { Elysia, t } from "elysia"

const items = [
	{ id: "1", name: "Read the SSR guide" },
	{ id: "2", name: "Try a client mutation" },
]

export const app = new Elysia({ prefix: "/api" })
	.onAfterHandle(({ set }) => {
		set.headers["Cache-Control"] = "no-store"
	})
	.get("/items", () => items.map((item) => ({ ...item })))
	.post(
		"/items",
		({ body, status }) => {
			const name = body.name.trim()
			if (!name) return status(422, { message: "Enter an item name." })
			if (items.length >= 100)
				return status(409, {
					message: "The demo list is full. Restart the server to reset it.",
				})
			const item = { id: crypto.randomUUID(), name }
			items.push(item)
			return status(201, item)
		},
		{ body: t.Object({ name: t.String({ minLength: 1, maxLength: 120 }) }) },
	)

export type App = typeof app
