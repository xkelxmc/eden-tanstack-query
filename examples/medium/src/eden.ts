import { treaty } from "@elysiajs/eden"
import { createEdenTanStackQuery } from "eden-tanstack-react-query"

import type { App } from "./server"

/**
 * Create typed hooks and provider for Eden + TanStack Query
 * This provides useEden() hook similar to useTRPC()
 */
export const { EdenProvider, useEden, useEdenClient } =
	createEdenTanStackQuery<App>()

/**
 * Standalone Eden client (for non-React usage)
 */
export const edenClient = treaty<App>("http://localhost:3002")
