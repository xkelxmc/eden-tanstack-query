import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { getEden } from "./lib/client"
import { routeTree } from "./routeTree.gen"

export async function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { staleTime: 60_000, retry: false } },
	})
	const eden = await getEden()
	const router = createRouter({
		routeTree,
		context: { queryClient, eden },
		defaultPreload: false,
		defaultPreloadStaleTime: 0,
		scrollRestoration: true,
	})
	setupRouterSsrQueryIntegration({ router, queryClient })
	return router
}
declare module "@tanstack/react-router" {
	interface Register {
		router: Awaited<ReturnType<typeof getRouter>>
	}
}
