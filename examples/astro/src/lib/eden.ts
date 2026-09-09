import { createEdenTanStackQuery } from "eden-tanstack-react-query"
import type { App } from "../server/app"

export const { EdenProvider, useEden } = createEdenTanStackQuery<App>()
