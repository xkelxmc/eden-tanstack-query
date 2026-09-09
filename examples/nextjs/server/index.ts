import { app } from "./app"

app.listen({
	hostname: "127.0.0.1",
	port: Number(process.env.API_PORT ?? 3001),
})
console.log(`Elysia API listening on ${app.server?.url}`)
