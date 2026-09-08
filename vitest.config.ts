import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: [
			"./packages/eden-tanstack-query/test-utils/testing-library.ts",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["packages/eden-tanstack-query/src/**/*.{ts,tsx}"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/test/**",
				"**/test-utils/**",
			],
		},
	},
})
