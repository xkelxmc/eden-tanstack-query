import browserCollections from "fumadocs-mdx:collections/browser"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useFumadocsLoader } from "fumadocs-core/source/client"
import * as TabsComponents from "fumadocs-ui/components/tabs"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/layouts/docs/page"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { Suspense } from "react"
import { LLMCopyButton, ViewOptions } from "~/components/page-actions"
import { baseOptions } from "~/lib/layout.shared"
import { source } from "~/lib/source"

export const Route = createFileRoute("/docs/$")({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split("/") ?? []
		const data = await serverLoader({ data: slugs })
		await clientLoader.preload(data.path)
		return data
	},
})

const serverLoader = createServerFn({
	method: "GET",
})
	.inputValidator((slugs: string[]) => slugs)
	.handler(async ({ data: slugs }) => {
		const page = source.getPage(slugs)
		if (!page) throw notFound()

		return {
			path: page.path,
			url: page.url,
			pageTree: await source.serializePageTree(source.getPageTree()),
		}
	})

const clientLoader = browserCollections.docs.createClientLoader({
	component(
		{ toc, frontmatter, default: MDX },
		props: { className?: string; url: string; contentPath: string },
	) {
		return (
			<DocsPage toc={toc} className={props.className}>
				<DocsTitle>{frontmatter.title}</DocsTitle>
				<DocsDescription>{frontmatter.description}</DocsDescription>
				<div className="flex flex-row gap-2 items-center border-b pb-4 mb-6">
					<LLMCopyButton markdownUrl={`${props.url}.mdx`} />
					<ViewOptions
						markdownUrl={`${props.url}.mdx`}
						githubUrl={`https://github.com/xkelxmc/eden-tanstack-query/blob/main/apps/docs/content/docs/${props.contentPath}`}
					/>
				</div>
				<DocsBody>
					<MDX components={{ ...defaultMdxComponents, ...TabsComponents }} />
				</DocsBody>
			</DocsPage>
		)
	},
})

function Page() {
	const data = useFumadocsLoader(Route.useLoaderData())

	return (
		<DocsLayout {...baseOptions()} tree={data.pageTree}>
			<Suspense>
				{clientLoader.useContent(data.path, {
					className: "",
					url: data.url,
					contentPath: data.path,
				})}
			</Suspense>
		</DocsLayout>
	)
}
