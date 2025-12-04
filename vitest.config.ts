import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: [
			"./packages/eden-tanstack-query/test-utils/testing-library.ts",
		],
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["packages/eden-tanstack-query/src/**/*.ts"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/test/**",
				"**/test-utils/**",
			],
		},
	},
})
