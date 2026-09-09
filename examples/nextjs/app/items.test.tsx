import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type {} from "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { serverEden } from "../lib/eden.server"
import { createQueryClient } from "../lib/query-client"
import { app } from "../server/app"
import { Items } from "./items"
import { Providers } from "./providers"

vi.mock("server-only", () => ({}))
vi.mock(
	"eden-tanstack-react-query",
	async () => import("../../../packages/eden-tanstack-query/src"),
)

afterEach(() => {
	vi.unstubAllGlobals()
})

test("preserves date-shaped names through server hydration and browser mutations", async () => {
	const fetchApi = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
		app.handle(new Request(input, init)),
	)
	vi.stubGlobal("fetch", fetchApi)
	const serverName = "2026-09-09"
	await app.handle(
		new Request("http://localhost/api/items", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: serverName }),
		}),
	)
	const queryClient = createQueryClient()
	const queryOptions = serverEden.api.items.get.queryOptions()
	await queryClient.prefetchQuery(queryOptions)
	expect(queryClient.getQueryData(queryOptions.queryKey)).toContainEqual({
		id: expect.any(String),
		name: serverName,
	})
	const state = dehydrate(queryClient)
	queryClient.clear()
	fetchApi.mockClear()

	render(
		<Providers>
			<HydrationBoundary state={state}>
				<Items />
			</HydrationBoundary>
		</Providers>,
	)
	expect(screen.getByText(serverName)).toBeInTheDocument()
	expect(fetchApi).not.toHaveBeenCalled()

	const browserName = "2026-09-10T12:00:00.000Z"
	fireEvent.change(screen.getByLabelText("New item"), {
		target: { value: browserName },
	})
	fireEvent.click(screen.getByRole("button", { name: "Add item" }))
	await screen.findByText(browserName)
	expect(screen.getByText(serverName)).toBeInTheDocument()
	await waitFor(() => {
		expect(screen.getByLabelText("New item")).toHaveValue("")
		expect(screen.getByText("Item added.")).toBeInTheDocument()
	})
	expect(fetchApi).toHaveBeenCalledTimes(2)
})
