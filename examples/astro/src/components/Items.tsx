import { treaty } from "@elysiajs/eden"
import {
	type DehydratedState,
	HydrationBoundary,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { useState } from "react"
import { EdenProvider, useEden } from "../lib/eden"
import { createQueryClient } from "../lib/query-client"
import type { App } from "../server/app"

function ItemList() {
	const eden = useEden()
	const queryClient = useQueryClient()
	const [name, setName] = useState("")
	const items = useQuery(eden.api.items.get.queryOptions())
	const addItem = useMutation({
		...eden.api.items.post.mutationOptions(),
		onSuccess: async () => {
			setName("")
			await queryClient.invalidateQueries({
				queryKey: eden.api.items.get.queryKey(),
			})
		},
	})

	return (
		<section aria-label="Shared items">
			{items.isPending && <p role="status">Loading items…</p>}
			{items.isError && (
				<p role="alert">
					Could not load items.{" "}
					<button type="button" onClick={() => items.refetch()}>
						Retry
					</button>
				</p>
			)}
			<ul>
				{items.data?.map((item) => (
					<li key={item.id}>{item.name}</li>
				))}
			</ul>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					if (name.trim() && !addItem.isPending)
						addItem.mutate({ name: name.trim() })
				}}
			>
				<label htmlFor="item-name">New item</label>
				<div className="form-row">
					<input
						id="item-name"
						name="name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
						maxLength={120}
						disabled={addItem.isPending}
					/>
					<button type="submit" disabled={addItem.isPending || !name.trim()}>
						{addItem.isPending ? "Adding…" : "Add item"}
					</button>
				</div>
				<p role="status" className="status">
					{addItem.isPending
						? "Saving your item…"
						: addItem.isSuccess
							? "Item added."
							: ""}
				</p>
				{addItem.isError && (
					<p role="alert">
						{addItem.error.status === 409
							? "The demo list is full. Restart the server to reset it."
							: "Could not add the item. Try again."}
					</p>
				)}
			</form>
		</section>
	)
}

export default function Items({
	dehydratedState,
}: {
	dehydratedState: DehydratedState
}) {
	const [queryClient] = useState(createQueryClient)
	const [client] = useState(() =>
		treaty<App>(
			typeof window === "undefined"
				? "http://localhost"
				: window.location.origin,
		),
	)

	return (
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={client}>
				<HydrationBoundary state={dehydratedState}>
					<ItemList />
				</HydrationBoundary>
			</EdenProvider>
		</QueryClientProvider>
	)
}
