import { treaty } from "@elysiajs/eden"
import { createIsomorphicFn } from "@tanstack/react-start"
import { createEdenOptionsProxy } from "eden-tanstack-react-query"
import type { App } from "./api.server"

export const getClient: () => Promise<ReturnType<typeof treaty<App>>> =
	createIsomorphicFn()
		.server(async () => {
			const [{ getRequest }, { api }] = await Promise.all([
				import("@tanstack/react-start/server"),
				import("./api.server"),
			])
			const request = getRequest()
			return treaty(api, {
				headers: { cookie: request.headers.get("cookie") ?? "" },
			})
		})
		.client(async () =>
			treaty<App>(window.location.origin, {
				fetch: { credentials: "same-origin", cache: "no-store" },
			}),
		)

export async function getEden() {
	return createEdenOptionsProxy<App>({ client: await getClient() })
}
