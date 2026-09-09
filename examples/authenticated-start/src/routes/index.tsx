import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { getClient, type getEden } from "../lib/client"

export const Route = createFileRoute("/")({
	loader: async ({ context: { queryClient, eden } }) => {
		const session = await queryClient.ensureQueryData(
			eden.api.session.get.queryOptions(),
		)
		if (session.user)
			await queryClient.ensureQueryData(eden.api.items.get.queryOptions())
	},
	component: Home,
})
function Home() {
	const { queryClient, eden } = Route.useRouteContext()
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState("")
	const { data: session } = useSuspenseQuery({
		...eden.api.session.get.queryOptions(),
		refetchInterval: 60_000,
	})
	async function changeSession(identity?: "alice" | "bob") {
		setBusy(true)
		setError("")
		try {
			await queryClient.cancelQueries()
			const client = await getClient()
			const result = identity
				? await client.api.login.post({ identity })
				: await client.api.logout.post()
			if (result.error)
				throw new Error("Session change failed. Please try again.")
			try {
				const channel = new BroadcastChannel("demo-session")
				try {
					channel.postMessage("changed")
				} finally {
					channel.close()
				}
			} catch {
				// Local caches must reset even when browser messaging is unavailable.
			}
			queryClient.clear()
			window.location.replace("/")
		} catch {
			setError("Session change failed. Please try again.")
			setBusy(false)
		}
	}
	return (
		<section aria-busy={busy}>
			<h1>Your private list</h1>
			<p className="intro">Two demo identities. A separate list for each.</p>
			<div className="session">
				<p>
					Signed in as <strong>{session.user?.name ?? "Guest"}</strong>
				</p>
				<fieldset disabled={busy}>
					<legend>Demo sign-in</legend>
					<button type="button" onClick={() => changeSession("alice")}>
						Use Alice
					</button>
					<button type="button" onClick={() => changeSession("bob")}>
						Use Bob
					</button>
					{session.user && (
						<button type="button" onClick={() => changeSession()}>
							Log out
						</button>
					)}
				</fieldset>
				<p className="muted">
					Demo access only. No password or real account is required.
				</p>
			</div>
			{error && <p role="alert">{error}</p>}
			{busy ? (
				<p role="status">Changing session…</p>
			) : session.user ? (
				<PrivateList eden={eden} />
			) : (
				<p className="empty">Sign in as Alice or Bob to read their list.</p>
			)}
		</section>
	)
}
function PrivateList({ eden }: { eden: Awaited<ReturnType<typeof getEden>> }) {
	const { data } = useSuspenseQuery(eden.api.items.get.queryOptions())
	return (
		<section aria-label={`${data.owner}'s list`}>
			<h2>{data.owner}'s list</h2>
			<ul>
				{data.items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</section>
	)
}
