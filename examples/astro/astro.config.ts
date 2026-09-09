import node from "@astrojs/node"
import react from "@astrojs/react"
import { defineConfig } from "astro/config"

export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [react()],
	vite: {
		// Bun's isolated install does not hoist the adapter's runtime dependencies.
		plugins: [
			{
				name: "bundle-server-dependencies",
				apply: "build",
				config: () => ({ ssr: { noExternal: true } }),
			},
		],
	},
})
