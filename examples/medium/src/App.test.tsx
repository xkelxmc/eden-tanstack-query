import { treaty } from "@elysiajs/eden"
import type {} from "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import App from "./App"
import type { App as ServerApp } from "./server"

vi.mock("./eden", async () => {
	const { createEdenTanStackQuery } = await import(
		"../../../packages/eden-tanstack-query/src"
	)
	return {
		...createEdenTanStackQuery<ServerApp>(),
		edenClient: treaty<ServerApp>("http://example.test"),
	}
})

afterEach(() => {
	vi.unstubAllGlobals()
})

test("create user retains the failed draft and clears it after a successful retry", async () => {
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
			const path = new URL(request.url).pathname
			if (request.method === "POST" && path === "/users") {
				submittedBodies.push(await request.json())
				return submittedBodies.length === 1
					? pendingResponse
					: Response.json({ id: "new-user", email: "draft@example.com" })
			}
			if (request.method === "GET" && path === "/users") {
				listReads++
				return Response.json([])
			}
			return Response.json(null)
		},
	)
	const view = render(<App />)

	try {
		await screen.findByText("No users yet")
		const email = screen.getByPlaceholderText("user@example.com")
		fireEvent.change(email, { target: { value: "draft@example.com" } })
		fireEvent.click(screen.getByRole("button", { name: "Add User" }))

		await waitFor(() => {
			expect(submittedBodies).toEqual([{ email: "draft@example.com" }])
			expect(email).toBeDisabled()
			expect(email).toHaveValue("draft@example.com")
			expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled()
		})
		if (!finishRequest) throw new Error("Missing pending request")
		finishRequest(
			Response.json("Email is temporarily unavailable", { status: 503 }),
		)

		await screen.findByText(/Error:/)
		expect(screen.getByPlaceholderText("user@example.com")).toBe(email)
		expect(email).toHaveValue("draft@example.com")
		expect(email).toBeEnabled()
		expect(listReads).toBe(1)
		const retry = screen.getByRole("button", { name: "Add User" })
		expect(retry).toBeEnabled()
		fireEvent.click(retry)

		await waitFor(() => {
			expect(submittedBodies).toEqual([
				{ email: "draft@example.com" },
				{ email: "draft@example.com" },
			])
			expect(email).toHaveValue("")
			expect(email).toBeEnabled()
			expect(screen.queryByText(/Error:/)).not.toBeInTheDocument()
			expect(listReads).toBe(2)
		})
	} finally {
		view.unmount()
	}
})
