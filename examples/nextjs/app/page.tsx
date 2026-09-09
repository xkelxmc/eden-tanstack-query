import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { connection } from "next/server"
import { serverEden } from "../lib/eden.server"
import { createQueryClient } from "../lib/query-client"
import { Items } from "./items"

export default async function Page() {
	await connection()
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(serverEden.api.items.get.queryOptions())
	return (
		<main>
			<p className="eyebrow">Eden TanStack Query · Next.js</p>
			<h1>Shared reading list</h1>
			<p className="intro">
				Add something you want to read. Everyone using this demo shares the same
				list.
			</p>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Items />
			</HydrationBoundary>
			<footer>
				Demo data lives in the API process and resets when it restarts.
			</footer>
		</main>
	)
}
