"use client"

import { treaty } from "@elysiajs/eden"
import { isServer, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"
import { EdenProvider } from "../lib/eden"
import { createQueryClient } from "../lib/query-client"
import type { App } from "../server/app"

let browserQueryClient: ReturnType<typeof createQueryClient> | undefined

function getQueryClient() {
	if (isServer) return createQueryClient()
	browserQueryClient ??= createQueryClient()
	return browserQueryClient
}

export function Providers({ children }: { children: ReactNode }) {
	const queryClient = getQueryClient()
	const [client] = useState(() =>
		treaty<App>(
			typeof window === "undefined"
				? "http://localhost"
				: window.location.origin,
			{ parseDate: false },
		),
	)
	return (
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={client}>{children}</EdenProvider>
		</QueryClientProvider>
	)
}
