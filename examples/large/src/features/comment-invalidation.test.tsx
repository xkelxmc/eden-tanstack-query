import { treaty } from "@elysiajs/eden"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {} from "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { EdenProvider } from "../eden"
import type { App } from "../server"
import { PostDetailTab } from "./posts"

vi.mock("../eden", async () => {
	const { createEdenTanStackQuery } = await import(
		"../../../../packages/eden-tanstack-query/src"
	)
	return createEdenTanStackQuery<App>()
})

afterEach(() => {
	vi.unstubAllGlobals()
})

test("creating a comment refreshes both the embedded post comments and the separate list", async () => {
	const comment = {
		id: "comment-1",
		text: "A newly created comment",
		postId: "post-1",
		authorId: "user-1",
		author: { email: "reader@example.com" },
	}
	let created = false
	const submittedBodies: unknown[] = []
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init)
			const path = new URL(request.url).pathname
			if (request.method === "POST" && path === "/comments") {
				submittedBodies.push(await request.json())
				created = true
				return Response.json(comment)
			}
			if (request.method === "GET" && path === "/posts/post-1") {
				return Response.json({
					id: "post-1",
					title: "A post with comments",
					comments: created ? [comment] : [],
				})
			}
			if (request.method === "GET" && path === "/posts/post-1/comments") {
				return Response.json(created ? [comment] : [])
			}
			throw new Error(`Unexpected request: ${request.method} ${request.url}`)
		},
	)
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Infinity, gcTime: 0 },
			mutations: { retry: false },
		},
	})
	const view = render(
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={treaty<App>("http://example.test")}>
				<PostDetailTab />
			</EdenProvider>
		</QueryClientProvider>,
	)

	try {
		await screen.findByRole("heading", { name: "Comments (0)" })
		await screen.findByText("No comments yet")
		expect(screen.getByText("No comments")).toBeInTheDocument()
		const input = screen.getByPlaceholderText("Write a comment...")
		fireEvent.change(input, { target: { value: comment.text } })
		fireEvent.click(screen.getByRole("button", { name: "Comment" }))

		await screen.findByText(comment.text, { exact: true })
		await screen.findByRole("heading", { name: "Comments (1)" })
		expect(
			screen.getByText(`• ${comment.text}`, { exact: true }),
		).toBeInTheDocument()
		expect(screen.queryByText("No comments")).not.toBeInTheDocument()
		expect(screen.queryByText("No comments yet")).not.toBeInTheDocument()
		expect(submittedBodies).toEqual([
			{ text: comment.text, postId: "post-1", authorId: "user-1" },
		])
		await waitFor(() => {
			expect(input).toHaveValue("")
			expect(input).toBeEnabled()
			expect(screen.getByRole("button", { name: "Comment" })).toBeEnabled()
		})
	} finally {
		view.unmount()
		queryClient.clear()
	}
})
