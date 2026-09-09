import { Elysia, t } from "elysia"

const identities = {
	alice: {
		id: "alice",
		name: "Alice",
		items: ["Review Alice's draft", "Plan Alice's workshop"],
	},
	bob: {
		id: "bob",
		name: "Bob",
		items: ["Prepare Bob's release", "Read Bob's notes"],
	},
}
const sessions = new Map<
	string,
	{ identity: keyof typeof identities; expires: number }
>()
const lifetime = 60 * 60
const maxSessions = 1000

function sessionToken(request: Request) {
	return request.headers
		.get("cookie")
		?.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith("demo_session="))
		?.slice("demo_session=".length)
}
function currentUser(request: Request) {
	const token = sessionToken(request)
	const session = token ? sessions.get(token) : undefined
	if (!session || session.expires <= Date.now()) {
		if (token) sessions.delete(token)
		return null
	}
	return identities[session.identity]
}
function cookie(value: string, request: Request, maxAge = lifetime) {
	const secure =
		new URL(request.url).protocol === "https:" ||
		process.env.NODE_ENV === "production"
	return `demo_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`
}

export const api = new Elysia({ prefix: "/api" })
	.onRequest(({ request, set, status }) => {
		set.headers["cache-control"] = "private, no-store"
		set.headers.vary = "Cookie"
		if (
			request.method !== "GET" &&
			request.method !== "HEAD" &&
			request.headers.get("origin") !== new URL(request.url).origin
		) {
			return status(403, { message: "Same-origin requests only" })
		}
	})
	.get("/session", ({ request }) => {
		const user = currentUser(request)
		return { user: user ? { id: user.id, name: user.name } : null }
	})
	.post(
		"/login",
		({ body, request, set, status }) => {
			const previous = sessionToken(request)
			if (previous) sessions.delete(previous)
			for (const [token, session] of sessions)
				if (session.expires <= Date.now()) sessions.delete(token)
			if (sessions.size >= maxSessions)
				return status(503, {
					message: "Session capacity reached. Try again later.",
				})
			const token = crypto.randomUUID()
			sessions.set(token, {
				identity: body.identity,
				expires: Date.now() + lifetime * 1000,
			})
			set.headers["set-cookie"] = cookie(token, request)
			return { ok: true }
		},
		{
			body: t.Object({
				identity: t.Union([t.Literal("alice"), t.Literal("bob")]),
			}),
		},
	)
	.post("/logout", ({ request, set }) => {
		const token = sessionToken(request)
		if (token) sessions.delete(token)
		set.headers["set-cookie"] = cookie("", request, 0)
		return { ok: true }
	})
	.get("/items", ({ request, status }) => {
		const user = currentUser(request)
		if (!user) return status(401, { message: "Sign in to read your list" })
		return { owner: user.name, items: user.items }
	})

export type App = typeof api
