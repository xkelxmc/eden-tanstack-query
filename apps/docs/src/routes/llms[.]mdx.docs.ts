import { createFileRoute, notFound } from "@tanstack/react-router"
import { getLLMText } from "~/lib/get-llm-text"
import { source } from "~/lib/source"

export const Route = createFileRoute("/llms.mdx/docs")({
	server: {
		handlers: {
			GET: async () => {
				const page = source.getPage([])
				if (!page) throw notFound()

				return new Response(await getLLMText(page), {
					headers: {
						"Content-Type": "text/markdown",
					},
				})
			},
		},
	},
})
