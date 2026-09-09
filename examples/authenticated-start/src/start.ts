import { createMiddleware, createStart } from "@tanstack/react-start"

const privateResponses = createMiddleware().server(async ({ next }) => {
	const result = await next()
	result.response.headers.set("Cache-Control", "private, no-store")
	result.response.headers.append("Vary", "Cookie")
	return result
})
export const startInstance = createStart(() => ({
	requestMiddleware: [privateResponses],
}))
