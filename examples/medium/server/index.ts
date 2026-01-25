import { cors } from "@elysiajs/cors"
import { db } from "../src/db/client"
import { app } from "../src/server"

async function seed() {
	const user = await db.user.upsert({
		where: { id: "user-1" },
		update: {},
		create: { id: "user-1", email: "test@example.com", name: "Test User" },
	})

	await db.post.upsert({
		where: { id: "post-1" },
		update: {},
		create: {
			id: "post-1",
			title: "First Post",
			content: "Hello world",
			authorId: user.id,
		},
	})

	console.log("Seed data created")
}

seed().then(() => {
	app.use(cors()).listen(3002)
	console.log("Server running at http://localhost:3002")
})
