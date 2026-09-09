import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({ component: About })
function About() {
	return (
		<section>
			<h1>About this demo</h1>
			<p>Alice and Bob have separate server-side sessions and private lists.</p>
			<p>
				The first page loads its list on the server. TanStack Router hydrates
				TanStack Query so the browser can use the same data without fetching it
				again.
			</p>
			<p>
				These links use client navigation. Changing identity reloads the
				document and discards the previous session's browser caches.
			</p>
			<p>
				This is demo authentication with an in-memory session store. Restarting
				the server signs everyone out.
			</p>
			<Link to="/">Back to your list</Link>
		</section>
	)
}
