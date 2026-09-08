import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { LLMCopyButton } from "./page-actions"

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

test("handles failed Markdown responses, then retries and caches successful content", async () => {
	const failedResponse = new Response("Internal Server Error", { status: 500 })
	const readFailedBody = vi.spyOn(failedResponse, "text")
	const fetchMarkdown = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(failedResponse)
		.mockResolvedValueOnce(new Response("# Documentation"))
	vi.stubGlobal("fetch", fetchMarkdown)

	const copied: string[] = []
	const write = vi
		.spyOn(navigator.clipboard, "write")
		.mockImplementation(async (items) => {
			for (const item of items) {
				copied.push(await (await item.getType("text/plain")).text())
			}
		})
	const writeText = vi
		.spyOn(navigator.clipboard, "writeText")
		.mockResolvedValue(undefined)

	render(<LLMCopyButton markdownUrl="/docs/retry-copy.mdx" />)

	fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }))
	await screen.findByRole("button", { name: "Copy failed. Try again." })
	expect(write).toHaveBeenCalledTimes(1)
	expect(readFailedBody).not.toHaveBeenCalled()
	expect(copied).toEqual([])
	expect(writeText).not.toHaveBeenCalled()
	expect(
		screen.getByRole("button", { name: "Copy failed. Try again." }),
	).toHaveProperty("disabled", false)

	fireEvent.click(
		screen.getByRole("button", { name: "Copy failed. Try again." }),
	)
	await waitFor(() => expect(copied).toEqual(["# Documentation"]))
	expect(fetchMarkdown).toHaveBeenCalledTimes(2)
	expect(fetchMarkdown).toHaveBeenLastCalledWith("/docs/retry-copy.mdx")
	expect(copied).toEqual(["# Documentation"])

	fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }))
	await waitFor(() =>
		expect(writeText).toHaveBeenCalledExactlyOnceWith("# Documentation"),
	)
	expect(fetchMarkdown).toHaveBeenCalledTimes(2)
	expect(write).toHaveBeenCalledTimes(2)
	expect(writeText).toHaveBeenCalledExactlyOnceWith("# Documentation")
})
