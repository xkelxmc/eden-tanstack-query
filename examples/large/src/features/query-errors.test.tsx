import { treaty } from "@elysiajs/eden"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {} from "@testing-library/jest-dom/vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
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

function renderTab(tab: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Infinity, gcTime: 0 },
			mutations: { retry: false },
		},
	})
	const view = render(
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={treaty<App>("http://example.test")}>
				{tab}
			</EdenProvider>
		</QueryClientProvider>,
	)
	return {
		queryClient,
		unmount() {
			view.unmount()
			queryClient.clear()
		},
	}
}

test("initial detail failure shows an error without claiming the user is missing", async () => {
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const path = new URL(new Request(input, init).url).pathname
			return path === "/users/user-1"
				? Response.json("User service unavailable", { status: 503 })
				: Response.json([])
		},
	)
	const view = renderTab(<UsersTab />)
	try {
		await screen.findByText(/User service unavailable/)
		expect(screen.queryByText("User not found")).not.toBeInTheDocument()
	} finally {
		view.unmount()
	}
})

test("successful null shows not found and keeps that result beside a refetch error", async () => {
	let detailReads = 0
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const path = new URL(new Request(input, init).url).pathname
			if (path !== "/users/user-1") return Response.json([])
			detailReads++
			return detailReads === 1
				? Response.json(null)
				: Response.json("User service unavailable", { status: 503 })
		},
	)
	const view = renderTab(<UsersTab />)
	try {
		await screen.findByText("User not found")
		expect(screen.queryByText(/Error:/)).not.toBeInTheDocument()

		await act(() => view.queryClient.refetchQueries({ type: "active" }))

		await screen.findByText(/User service unavailable/)
		expect(detailReads).toBe(2)
		expect(screen.getByText("User not found")).toBeInTheDocument()
	} finally {
		view.unmount()
	}
})

test("failed detail refetch retains the cached user beside the error", async () => {
	let detailReads = 0
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const path = new URL(new Request(input, init).url).pathname
			if (path !== "/users/user-1") return Response.json([])
			detailReads++
			return detailReads === 1
				? Response.json({
						id: "user-1",
						name: "Cached user",
						email: "cached@example.com",
						posts: [{ id: "post-1" }],
						comments: [],
					})
				: Response.json("User service unavailable", { status: 503 })
		},
	)
	const view = renderTab(<UsersTab />)
	try {
		const heading = await screen.findByRole("heading", { name: "Cached user" })

		await act(() => view.queryClient.refetchQueries({ type: "active" }))

		await screen.findByText(/User service unavailable/)
		expect(detailReads).toBe(2)
		expect(screen.getByRole("heading", { name: "Cached user" })).toBe(heading)
		expect(screen.getByText("cached@example.com")).toBeInTheDocument()
		expect(screen.getByText("Posts: 1")).toBeInTheDocument()
		expect(screen.queryByText("User not found")).not.toBeInTheDocument()
	} finally {
		view.unmount()
	}
})

test("initial settings and subscription failures do not display unconfirmed defaults", async () => {
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const path = new URL(new Request(input, init).url).pathname
			if (path === "/organizations/org-1/settings") {
				return Response.json("Settings unavailable", { status: 503 })
			}
			if (path === "/organizations/org-1/subscription") {
				return Response.json("Subscription unavailable", { status: 503 })
			}
			return Response.json(null)
		},
	)
	const view = renderTab(<OrganizationsTab />)
	try {
		await screen.findByText(/Settings unavailable/)
		await screen.findByText(/Subscription unavailable/)
		expect(screen.queryByText("default")).not.toBeInTheDocument()
		expect(screen.queryByText("inactive")).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Save Settings" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Update Subscription" }),
		).not.toBeInTheDocument()
	} finally {
		view.unmount()
	}
})

test("failed refetch keeps settings defaults, cached subscription and both form drafts mounted", async () => {
	let settingsReads = 0
	let subscriptionReads = 0
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const path = new URL(new Request(input, init).url).pathname
			if (path === "/organizations/org-1/settings") {
				settingsReads++
				return settingsReads === 1
					? Response.json(null)
					: Response.json("Settings unavailable", { status: 503 })
			}
			if (path === "/organizations/org-1/subscription") {
				subscriptionReads++
				return subscriptionReads === 1
					? Response.json({ plan: "starter", status: "active" })
					: Response.json("Subscription unavailable", { status: 503 })
			}
			return Response.json(null)
		},
	)
	const view = renderTab(<OrganizationsTab />)
	try {
		await screen.findByRole("button", { name: "Save Settings" })
		await screen.findByRole("button", { name: "Update Subscription" })
		expect(screen.getByText("default")).toBeInTheDocument()
		expect(screen.getByText("en")).toBeInTheDocument()
		expect(screen.getByText("starter")).toBeInTheDocument()
		expect(screen.queryByText(/Error:/)).not.toBeInTheDocument()
		const theme = screen.getByDisplayValue("Select theme")
		const language = screen.getByDisplayValue("Select language")
		const plan = screen.getByDisplayValue("Select plan")
		fireEvent.change(theme, { target: { value: "dark" } })
		fireEvent.change(language, { target: { value: "ru" } })
		fireEvent.change(plan, { target: { value: "pro" } })

		await act(() => view.queryClient.refetchQueries({ type: "active" }))

		await screen.findByText(/Settings unavailable/)
		await screen.findByText(/Subscription unavailable/)
		expect(settingsReads).toBe(2)
		expect(subscriptionReads).toBe(2)
		expect(screen.getByDisplayValue("Dark")).toBe(theme)
		expect(screen.getByDisplayValue("Russian")).toBe(language)
		expect(screen.getByDisplayValue("Pro")).toBe(plan)
		expect(screen.getByText("default")).toBeInTheDocument()
		expect(screen.getByText("en")).toBeInTheDocument()
		expect(screen.getByText("starter")).toBeInTheDocument()
		expect(screen.getByText("active")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Save Settings" })).toBeEnabled()
		expect(
			screen.getByRole("button", { name: "Update Subscription" }),
		).toBeEnabled()
	} finally {
		view.unmount()
	}
})
