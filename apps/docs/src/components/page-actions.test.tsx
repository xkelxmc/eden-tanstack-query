import { act, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { LLMCopyButton } from "./page-actions"

const copyAction = vi.hoisted(() => ({ current: async () => {} }))

// The upstream hook leaves callback rejections unhandled.
vi.mock("fumadocs-ui/utils/use-copy-button", () => ({
	useCopyButton: (callback: () => Promise<void>) => {
		copyAction.current = callback
		return [false, callback]
	},
}))

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

test("rejects failed Markdown responses, then retries and caches successful content", async () => {
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

	await act(async () => {
		const pendingCopy = copyAction.current()
		expect(write).toHaveBeenCalledTimes(1)
		await expect(pendingCopy).rejects.toThrow("HTTP 500")
	})
	expect(readFailedBody).not.toHaveBeenCalled()
	expect(copied).toEqual([])
	expect(writeText).not.toHaveBeenCalled()
	expect(screen.getByRole("button", { name: "Copy Markdown" })).toHaveProperty(
		"disabled",
		false,
	)

	await act(() => copyAction.current())
	expect(fetchMarkdown).toHaveBeenCalledTimes(2)
	expect(fetchMarkdown).toHaveBeenLastCalledWith("/docs/retry-copy.mdx")
	expect(copied).toEqual(["# Documentation"])

	await act(() => copyAction.current())
	expect(fetchMarkdown).toHaveBeenCalledTimes(2)
	expect(write).toHaveBeenCalledTimes(2)
	expect(writeText).toHaveBeenCalledExactlyOnceWith("# Documentation")
})
