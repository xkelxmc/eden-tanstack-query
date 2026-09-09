import type { APIRoute } from "astro"
import { app } from "../../server/app"

export const ALL: APIRoute = ({ request, url }) => {
	if (
		request.method !== "GET" &&
		request.method !== "HEAD" &&
		request.headers.get("origin") !== url.origin
	) {
		return new Response("Same-origin requests required.", {
			status: 403,
			headers: { "Cache-Control": "no-store" },
		})
	}
	return app.handle(request)
}
