import { cors } from "@elysiajs/cors"
import { db } from "../src/db/client"
import { app } from "../src/server"

async function seed() {
	const user = await db.user.upsert({
		where: { id: "user-1" },
		update: {},
		create: { id: "user-1", email: "test@example.com", name: "Test User" },
	})

	const org = await db.organization.upsert({
		where: { id: "org-1" },
		update: {},
		create: { id: "org-1", name: "Test Org", slug: "test-org" },
	})

	await db.member.upsert({
		where: { id: "member-1" },
		update: {},
		create: {
			id: "member-1",
			userId: user.id,
			organizationId: org.id,
			role: "admin",
		},
	})

	await db.post.upsert({
		where: { id: "post-1" },
		update: {},
		create: {
			id: "post-1",
			title: "First Post",
			content: "Hello",
			authorId: user.id,
		},
	})

	await db.category.upsert({
		where: { id: "cat-1" },
		update: {},
		create: { id: "cat-1", name: "General", slug: "general" },
	})

	await db.tag.upsert({
		where: { id: "tag-1" },
		update: {},
		create: { id: "tag-1", name: "test", slug: "test" },
	})

	console.log("Seed data created")
}

seed().then(() => {
	app.use(cors()).listen(3003)
	console.log("Server running at http://localhost:3003")
})
