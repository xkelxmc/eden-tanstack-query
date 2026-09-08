import { treaty } from "@elysiajs/eden"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {} from "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { EdenProvider } from "../eden"
import type { App } from "../server"
import { AuditTab } from "./audit"

vi.mock("../eden", async () => {
	const { createEdenTanStackQuery } = await import(
		"../../../../packages/eden-tanstack-query/src"
	)
	return createEdenTanStackQuery<App>()
})

afterEach(() => {
	vi.unstubAllGlobals()
})

test("audit form preserves inputs and selection on failure and resets only draft fields on success", async () => {
	let finishRequest: ((response: Response) => void) | undefined
	const pendingResponse = new Promise<Response>((resolve) => {
		finishRequest = resolve
	})
	const submittedBodies: unknown[] = []
	let listReads = 0
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init)
			if (new URL(request.url).pathname !== "/audit-logs") {
				throw new Error(`Unexpected request: ${request.url}`)
			}
			if (request.method === "POST") {
				submittedBodies.push(await request.json())
				return submittedBodies.length === 1
					? pendingResponse
					: Response.json({ id: "new-log" })
			}
			listReads++
			return Response.json([])
		},
	)
	const client = treaty<App>("http://example.test")
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Infinity, gcTime: 0 },
			mutations: { retry: false },
		},
	})
	const view = render(
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={client}>
				<AuditTab />
			</EdenProvider>
		</QueryClientProvider>,
	)

	try {
		await screen.findByText("No audit logs")
		const action = screen.getByRole("combobox")
		const entity = screen.getByPlaceholderText("Entity (user, post, etc)")
		const entityId = screen.getByPlaceholderText("Entity ID")
		const userId = screen.getByPlaceholderText("User ID")
		const draft = {
			action: "update",
			entity: "post",
			entityId: "post-2",
			userId: "user-2",
		}
		fireEvent.change(action, { target: { value: draft.action } })
		fireEvent.change(entity, { target: { value: draft.entity } })
		fireEvent.change(entityId, { target: { value: draft.entityId } })
		fireEvent.change(userId, { target: { value: draft.userId } })
		fireEvent.click(screen.getByRole("button", { name: "Add Log" }))

		await waitFor(() => {
			expect(submittedBodies).toEqual([draft])
			for (const control of [action, entity, entityId, userId]) {
				expect(control).toBeDisabled()
			}
			expect(action).toHaveValue(draft.action)
			expect(entity).toHaveValue(draft.entity)
			expect(entityId).toHaveValue(draft.entityId)
			expect(screen.getByRole("button", { name: "Logging..." })).toBeDisabled()
		})
		if (!finishRequest) throw new Error("Missing pending request")
		finishRequest(Response.json("Audit service unavailable", { status: 503 }))

		await screen.findByText(/Error:/)
		expect(screen.getByRole("combobox")).toBe(action)
		for (const control of [action, entity, entityId, userId]) {
			expect(control).toBeEnabled()
		}
		expect(action).toHaveValue(draft.action)
		expect(entity).toHaveValue(draft.entity)
		expect(entityId).toHaveValue(draft.entityId)
		expect(userId).toHaveValue(draft.userId)
		expect(listReads).toBe(1)
		const retry = screen.getByRole("button", { name: "Add Log" })
		expect(retry).toBeEnabled()
		fireEvent.click(retry)

		await waitFor(() => {
			expect(submittedBodies).toEqual([draft, draft])
			for (const control of [action, entity, entityId]) {
				expect(control).toHaveValue("")
				expect(control).toBeEnabled()
			}
			expect(userId).toHaveValue(draft.userId)
			expect(userId).toBeEnabled()
			expect(screen.queryByText(/Error:/)).not.toBeInTheDocument()
			expect(listReads).toBe(2)
		})
	} finally {
		view.unmount()
		queryClient.clear()
	}
})
