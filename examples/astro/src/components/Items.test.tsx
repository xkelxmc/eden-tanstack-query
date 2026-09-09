import { treaty } from "@elysiajs/eden"
import { dehydrate } from "@tanstack/react-query"
import type {} from "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { createEdenOptionsProxy } from "../../../../packages/eden-tanstack-query/src"
import { createQueryClient } from "../lib/query-client"
import { type App, app } from "../server/app"
import Items from "./Items"

vi.mock("../lib/eden", async () => {
	const { createEdenTanStackQuery } = await import(
		"../../../../packages/eden-tanstack-query/src"
	)
	return createEdenTanStackQuery<App>()
})

afterEach(() => {
	vi.unstubAllGlobals()
})

test("hydrates server items without refetching and retries a failed mutation before invalidating the list", async () => {
	const queryClient = createQueryClient()
	const eden = createEdenOptionsProxy<App>({ client: treaty(app) })
	await queryClient.prefetchQuery(eden.api.items.get.queryOptions())
	const dehydratedState = dehydrate(queryClient)
	queryClient.clear()

	let finishRequest: ((response: Response) => void) | undefined
	const pendingResponse = new Promise<Response>((resolve) => {
		finishRequest = resolve
	})
	const requests: string[] = []
	const submittedBodies: unknown[] = []
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init)
			expect(new URL(request.url).pathname).toBe("/api/items")
			requests.push(request.method)
			if (request.method === "POST") {
				submittedBodies.push(await request.clone().json())
				if (submittedBodies.length === 1) return pendingResponse
			}
			return app.handle(request)
		},
	)
	const view = render(<Items dehydratedState={dehydratedState} />)

	try {
		expect(screen.getByText("Read the SSR guide")).toBeInTheDocument()
		const input = screen.getByLabelText("New item")
		const name = "An item added after hydration"
		fireEvent.change(input, { target: { value: name } })
		fireEvent.click(screen.getByRole("button", { name: "Add item" }))
		await waitFor(() => {
			expect(requests).toEqual(["POST"])
			expect(input).toBeDisabled()
			expect(input).toHaveValue(name)
			expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled()
		})
		if (!finishRequest) throw new Error("Missing pending request")
		finishRequest(Response.json({ message: "Unavailable" }, { status: 503 }))
		await screen.findByText("Could not add the item. Try again.")
		expect(input).toHaveValue(name)
		expect(input).toBeEnabled()
		expect(requests).toEqual(["POST"])

		fireEvent.click(screen.getByRole("button", { name: "Add item" }))
		await screen.findByText(name)
		await waitFor(() => {
			expect(requests).toEqual(["POST", "POST", "GET"])
			expect(submittedBodies).toEqual([{ name }, { name }])
			expect(input).toHaveValue("")
			expect(input).toBeEnabled()
			expect(screen.getByText("Item added.")).toBeInTheDocument()
			expect(screen.queryByRole("alert")).not.toBeInTheDocument()
		})
	} finally {
		view.unmount()
	}
})
