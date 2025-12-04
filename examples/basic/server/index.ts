import { cors } from "@elysiajs/cors"
import { Elysia, t } from "elysia"

const app = new Elysia()
	.use(cors())
	.get("/api/hello", () => ({ message: "Hello from Elysia!" }))
	.get("/api/users", () => [
		{ id: "1", name: "Alice" },
		{ id: "2", name: "Bob" },
	])
	.get("/api/users/:id", ({ params }) => ({
		id: params.id,
		name: `User ${params.id}`,
	}))
	.post(
		"/api/users",
		({ body }) => ({
			id: String(Date.now()),
			...body,
		}),
		{
			body: t.Object({
				name: t.String(),
			}),
		},
	)
	.listen(3001)

console.log(`Server running at http://localhost:3001`)

export type App = typeof app
