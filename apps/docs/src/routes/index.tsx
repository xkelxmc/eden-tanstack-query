import { createFileRoute, Link, linkOptions } from "@tanstack/react-router"
import {
	ArrowRight,
	Code2,
	Package,
	RefreshCw,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react"

const docsLinkOptions = linkOptions({
	to: "/docs/$",
	params: { _splat: "" },
})

export const Route = createFileRoute("/")({
	component: HomePage,
})

const features = [
	{
		icon: Shield,
		title: "End-to-end Type Safety",
		description:
			"Full TypeScript inference from your Elysia routes to React components",
	},
	{
		icon: Zap,
		title: "Native TanStack Query",
		description:
			"Use standard useQuery, useMutation, useInfiniteQuery patterns",
	},
	{
		icon: Package,
		title: "Query Options Factories",
		description:
			"queryOptions(), mutationOptions(), infiniteQueryOptions() built-in",
	},
	{
		icon: Sparkles,
		title: "Auto Query Keys",
		description: "Type-safe keys derived automatically from route paths",
	},
	{
		icon: Code2,
		title: "Path Parameters",
		description: 'eden.users({ id: "1" }).get.queryOptions() just works',
	},
	{
		icon: RefreshCw,
		title: "Cache Invalidation",
		description: "queryFilter() helpers for smart cache management",
	},
]

const codeExample = `import { useQuery, useMutation } from '@tanstack/react-query'
import { useEden } from './lib/eden'

function UserList() {
  const eden = useEden()

  // Fully typed query
  const { data: users } = useQuery(
    eden.users.get.queryOptions()
  )

  // Type-safe mutation
  const createUser = useMutation({
    ...eden.users.post.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: eden.users.get.queryKey()
      })
    }
  })

  return <div>...</div>
}`

function HomePage() {
	return (
		<main className="flex min-h-screen flex-col">
			{/* Hero Section */}
			<section className="relative flex flex-col items-center justify-center px-6 py-24 md:py-32 overflow-hidden">
				{/* Subtle gradient background */}
				<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.12),transparent)]" />

				<div className="max-w-3xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-muted/50 px-4 py-1.5 text-sm text-fd-muted-foreground mb-6">
						<Sparkles className="size-3.5" />
						<span>Type-safe queries for Elysia</span>
					</div>

					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-fd-foreground to-fd-foreground/70 bg-clip-text text-transparent">
						Eden TanStack Query
					</h1>

					<p className="text-lg md:text-xl text-fd-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
						Type-safe TanStack Query integration for Elysia Eden.
						<br className="hidden sm:block" />
						Like{" "}
						<code className="text-fd-foreground font-mono text-base bg-fd-muted px-1.5 py-0.5 rounded">
							@trpc/react-query
						</code>
						, but for Elysia.
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							{...docsLinkOptions}
							className="inline-flex items-center gap-2 bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 rounded-lg px-6 py-3 font-medium transition-all hover:gap-3"
						>
							Get Started
							<ArrowRight className="size-4" />
						</Link>

						<a
							href="https://github.com/xkelxmc/eden-tanstack-query"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 border border-fd-border hover:bg-fd-accent hover:text-fd-accent-foreground rounded-lg px-6 py-3 font-medium transition-colors"
						>
							<svg
								className="size-5"
								fill="currentColor"
								viewBox="0 0 24 24"
								role="img"
								aria-label="GitHub"
							>
								<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
							</svg>
							GitHub
						</a>
					</div>
				</div>
			</section>

			{/* Install Command */}
			<section className="px-6 pb-16">
				<div className="max-w-2xl mx-auto">
					<div className="relative group">
						<div className="absolute -inset-0.5 bg-gradient-to-r from-fd-primary/20 to-fd-primary/5 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
						<div className="relative bg-fd-card border border-fd-border rounded-lg p-4 font-mono text-sm">
							<span className="text-fd-muted-foreground select-none">$ </span>
							<span className="text-fd-foreground">
								npm i eden-tanstack-react-query @tanstack/react-query
								@elysiajs/eden
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* Features Grid */}
			<section className="px-6 py-16 bg-fd-muted/30">
				<div className="max-w-5xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
						Everything you need
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="group p-6 rounded-xl border border-fd-border bg-fd-card hover:border-fd-primary/50 transition-colors"
							>
								<div className="inline-flex items-center justify-center size-10 rounded-lg bg-fd-primary/10 text-fd-primary mb-4 group-hover:bg-fd-primary/20 transition-colors">
									<feature.icon className="size-5" />
								</div>
								<h3 className="font-semibold mb-2">{feature.title}</h3>
								<p className="text-sm text-fd-muted-foreground leading-relaxed">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Code Example */}
			<section className="px-6 py-16">
				<div className="max-w-4xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
						Simple, intuitive API
					</h2>
					<p className="text-fd-muted-foreground text-center mb-10 max-w-xl mx-auto">
						Use familiar TanStack Query patterns with full type inference from
						your Elysia backend
					</p>

					<div className="relative">
						<div className="absolute top-3 left-4 flex items-center gap-1.5">
							<div className="size-3 rounded-full bg-fd-muted-foreground/20" />
							<div className="size-3 rounded-full bg-fd-muted-foreground/20" />
							<div className="size-3 rounded-full bg-fd-muted-foreground/20" />
						</div>
						<pre className="bg-fd-card border border-fd-border rounded-xl p-6 pt-10 overflow-x-auto">
							<code className="text-sm font-mono text-fd-foreground/90 leading-relaxed whitespace-pre">
								{codeExample}
							</code>
						</pre>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-6 py-16 border-t border-fd-border">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-2xl md:text-3xl font-bold mb-4">
						Ready to get started?
					</h2>
					<p className="text-fd-muted-foreground mb-8">
						Check out the documentation to learn how to integrate Eden TanStack
						Query into your project.
					</p>
					<Link
						{...docsLinkOptions}
						className="inline-flex items-center gap-2 bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 rounded-lg px-6 py-3 font-medium transition-all hover:gap-3"
					>
						Read the Docs
						<ArrowRight className="size-4" />
					</Link>
				</div>
			</section>

			{/* Footer */}
			<footer className="px-6 py-8 border-t border-fd-border mt-auto">
				<div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-fd-muted-foreground">
					<p>MIT License</p>
					<div className="flex items-center gap-6">
						<a
							href="https://github.com/xkelxmc/eden-tanstack-query"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-fd-foreground transition-colors"
						>
							GitHub
						</a>
						<a
							href="https://www.npmjs.com/package/eden-tanstack-react-query"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-fd-foreground transition-colors"
						>
							npm
						</a>
					</div>
				</div>
			</footer>
		</main>
	)
}
