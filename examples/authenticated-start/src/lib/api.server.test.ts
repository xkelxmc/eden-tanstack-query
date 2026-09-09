// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest"
import { api } from "./api.server"

afterEach(() => vi.restoreAllMocks())

function login(cookie = "") {
	return api.handle(
		new Request("http://localhost/api/login", {
			method: "POST",
			headers: {
				origin: "http://localhost",
				"content-type": "application/json",
				cookie,
			},
			body: JSON.stringify({ identity: "alice" }),
		}),
	)
}

test("bounds sessions while allowing rotation, logout, and expired capacity reuse", async () => {
	const now = Date.now()
	vi.spyOn(Date, "now").mockReturnValue(now)
	let cookie = ""
	for (let index = 0; index < 1000; index++) {
		const response = await login()
		expect(response.status).toBe(200)
		cookie = response.headers.get("set-cookie")?.split(";")[0] ?? ""
	}
	expect(cookie).not.toBe("")
	expect((await login()).status).toBe(503)
	const rotated = await login(cookie)
	expect(rotated.status).toBe(200)
	expect((await login()).status).toBe(503)
	const logout = await api.handle(
		new Request("http://localhost/api/logout", {
			method: "POST",
			headers: {
				origin: "http://localhost",
				cookie: rotated.headers.get("set-cookie")?.split(";")[0] ?? "",
			},
		}),
	)
	expect(logout.status).toBe(200)
	expect((await login()).status).toBe(200)
	expect((await login()).status).toBe(503)
	vi.spyOn(Date, "now").mockReturnValue(now + 60 * 60 * 1000)
	expect((await login()).status).toBe(200)
})
