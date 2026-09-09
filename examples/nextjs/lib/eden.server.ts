import "server-only"
import { treaty } from "@elysiajs/eden"
import { createEdenOptionsProxy } from "eden-tanstack-react-query"
import type { App } from "../server/app"

export const serverEden = createEdenOptionsProxy<App>({
	client: treaty<App>(process.env.INTERNAL_API_URL ?? "http://127.0.0.1:3001", {
		parseDate: false,
		fetch: { cache: "no-store" },
	}),
})
