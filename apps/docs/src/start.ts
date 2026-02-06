import { createMiddleware, createStart } from "@tanstack/react-start"

const llmMiddleware = createMiddleware().server(({ next, request }) => {
	const url = new URL(request.url)

	// Handle /docs.mdx (root docs page)
	if (url.pathname === "/docs.mdx") {
		return Response.redirect(new URL("/llms.mdx/docs", url), 302)
	}

	// Handle /docs/*.mdx (nested docs pages)
	const match = url.pathname.match(/^\/docs\/(.+)\.mdx$/)
	if (match) {
		const newPath = `/llms.mdx/docs/${match[1]}`
		return Response.redirect(new URL(newPath, url), 302)
	}

	return next()
})

export const startInstance = createStart(() => {
	return {
		requestMiddleware: [llmMiddleware],
	}
})
