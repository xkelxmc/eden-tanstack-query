import { defineConfig, defineDocs } from "fumadocs-mdx/config"
import lastModified from "fumadocs-mdx/plugins/last-modified"

export default defineConfig({
	plugins: [lastModified()],
	mdxOptions: {
		remarkNpmOptions: {
			persist: { id: "package-manager" },
		},
	},
})

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
})
