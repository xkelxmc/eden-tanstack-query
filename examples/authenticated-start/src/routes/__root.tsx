import type { QueryClient } from "@tanstack/react-query"
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import type { getEden } from "../lib/client"
import css from "../styles.css?url"

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
	eden: Awaited<ReturnType<typeof getEden>>
}>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Private list · Eden + Start" },
		],
		links: [{ rel: "stylesheet", href: css }],
	}),
	shellComponent: Document,
	component: () => (
		<main>
			<header>
				<p className="eyebrow">EDEN + TANSTACK START</p>
				<nav aria-label="Main">
					<Link to="/">Your list</Link>
					<Link to="/about">About this demo</Link>
				</nav>
			</header>
			<Outlet />
		</main>
	),
	errorComponent: () => (
		<section role="alert">
			<h1>Could not load this page</h1>
			<p>Your session may have expired.</p>
			<a href="/">Reload and sign in</a>
		</section>
	),
})
function Document({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	)
}
