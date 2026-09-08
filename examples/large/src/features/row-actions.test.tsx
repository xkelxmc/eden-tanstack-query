import { treaty } from "@elysiajs/eden"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { EdenProvider } from "../eden"
import type { App } from "../server"
import { OrganizationsTab } from "./organizations"
import { UsersTab } from "./users"

vi.mock("../eden", async () => {
	const { createEdenTanStackQuery } = await import(
		"../../../../packages/eden-tanstack-query/src"
	)
	return createEdenTanStackQuery<App>()
})

afterEach(() => {
	vi.unstubAllGlobals()
})

test.each([
	{
		action: "Mark read",
		Tab: UsersTab,
		listPath: "/users/user-1/notifications",
		mutationPath: "/notifications/notification-second/read",
		method: "PUT",
		label: "Second notification",
		rows: [
			{ id: "notification-first", title: "First notification", read: false },
			{ id: "notification-second", title: "Second notification", read: false },
		],
	},
	{
		action: "Revoke",
		Tab: UsersTab,
		listPath: "/users/user-1/sessions",
		mutationPath: "/sessions/session-second",
		method: "DELETE",
		label: "Second browser",
		rows: [
			{ id: "session-first", userAgent: "First browser", ip: "127.0.0.1" },
			{ id: "session-second", userAgent: "Second browser", ip: "127.0.0.2" },
		],
	},
	{
		action: "Delete",
		Tab: UsersTab,
		listPath: "/users/user-1/api-keys",
		mutationPath: "/api-keys/key-second",
		method: "DELETE",
		label: "Second key",
		rows: [
			{ id: "key-first", name: "First key", key: "sk_first" },
			{ id: "key-second", name: "Second key", key: "sk_second" },
		],
	},
	{
		action: "Mark Paid",
		Tab: OrganizationsTab,
		listPath: "/organizations/org-1/invoices",
		mutationPath: "/invoices/invoice-second/paid",
		method: "PUT",
		label: "INV-SECOND",
		rows: [
			{ id: "invoice-first", number: "INV-FIRST", amount: 10, status: "open" },
			{
				id: "invoice-second",
				number: "INV-SECOND",
				amount: 20,
				status: "open",
			},
		],
	},
])(
	"$action targets the selected row and refreshes its parent list",
	async ({ action, Tab, listPath, mutationPath, method, label, rows }) => {
		const requests: { method: string; path: string }[] = []
		vi.stubGlobal(
			"fetch",
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request = new Request(input, init)
				const path = new URL(request.url).pathname
				requests.push({ method: request.method, path })
				return Response.json(
					request.method === "GET" && path === listPath ? rows : null,
				)
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
					<Tab />
				</EdenProvider>
			</QueryClientProvider>,
		)

		try {
			const row = (await screen.findByText(label)).closest("li")
			if (!row) throw new Error(`Missing row for ${label}`)
			fireEvent.click(within(row).getByRole("button", { name: action }))

			await waitFor(() => {
				expect(requests.filter((request) => request.method !== "GET")).toEqual([
					{ method, path: mutationPath },
				])
				expect(
					requests.filter(
						(request) => request.method === "GET" && request.path === listPath,
					),
				).toHaveLength(2)
			})
		} finally {
			view.unmount()
			queryClient.clear()
		}
	},
)
