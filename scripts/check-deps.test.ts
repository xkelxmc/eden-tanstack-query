// @vitest-environment node
import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import { compareUsage, fetchMetadata, parseMetadata } from "./check-deps"

const script = fileURLToPath(new URL("./check-deps.ts", import.meta.url))
const roots: string[] = []
const metadata = {
	versions: { "1.0.0": {}, "1.5.0": {}, "2.0.0": {}, "2.1.0-beta.1": {} },
	"dist-tags": { latest: "2.0.0", next: "2.1.0-beta.1" },
}

afterEach(async () => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
	await Promise.all(
		roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
	)
})

async function fixture(files: Record<string, unknown>) {
	const root = await mkdtemp(join(tmpdir(), "check-deps-test-"))
	roots.push(root)
	for (const [path, data] of Object.entries(files)) {
		await mkdir(dirname(join(root, path)), { recursive: true })
		await writeFile(join(root, path), JSON.stringify(data))
	}
	return root
}

async function cli(root: string, preload: string) {
	const path = join(root, "registry.ts")
	await writeFile(path, preload)
	return spawnSync("bun", ["--no-install", "--preload", path, script], {
		cwd: root,
		encoding: "utf8",
		timeout: 10_000,
	})
}

const registry = `globalThis.fetch = async () => Response.json(${JSON.stringify(metadata)})`

describe("dependency report", () => {
	it("reports each workspace declaration, distinguishes peer support, and checks the pinned Bun version", async () => {
		const root = await fixture({
			"package.json": {
				name: "root",
				packageManager: "bun@1.0.0",
				workspaces: ["packages/*"],
				devDependencies: { shared: "2.0.0" },
			},
			"packages/client/package.json": {
				name: "client",
				dependencies: { shared: "1.0.0" },
				devDependencies: { adapter: "2.0.0" },
				peerDependencies: { adapter: "^1.0.0 || ^2.0.0" },
			},
			"bun.lock": {
				lockfileVersion: 1,
				workspaces: {
					"": { devDependencies: { shared: "2.0.0" } },
					"packages/client": {
						dependencies: { shared: "1.0.0" },
						devDependencies: { adapter: "2.0.0" },
						peerDependencies: { adapter: "^1.0.0 || ^2.0.0" },
					},
				},
				packages: {
					shared: ["shared@2.0.0"],
					"client/shared": ["shared@1.0.0"],
					adapter: ["adapter@2.0.0"],
				},
			},
		})
		const result = await cli(root, registry)
		expect(result.stderr).toBe("")
		expect(result.status).toBe(0)
		expect(result.stdout).toContain(
			"<root> devDependencies shared declared=2.0.0; locked=2.0.0; stable 2.0.0 is not newer",
		)
		expect(result.stdout).toContain(
			"packages/client dependencies shared declared=1.0.0; locked=1.0.0; stable update 2.0.0",
		)
		expect(result.stdout).toContain(
			"peerDependencies adapter declared=^1.0.0 || ^2.0.0; locked=2.0.0; peer support includes stable 2.0.0",
		)
		expect(result.stdout).toContain(
			"packageManager bun declared=1.0.0; stable update 2.0.0",
		)
		expect(result.stdout).not.toMatch(/drift|outside declaration|UNRESOLVED/)
		expect(result.stdout).toContain(
			"2 manifests, 5 usages, 3 registry lookups. Check complete.",
		)
	})

	it("exits unsuccessfully and names unsupported declarations and registry failures", async () => {
		const dependencies = {
			catalogued: "2.0.0",
			malformed: "1.0.0",
			unavailable: "1.0.0",
			slow: "1.0.0",
		}
		const root = await fixture({
			"package.json": {
				packageManager: "bun@1.0.0",
				workspaces: ["packages/*"],
				dependencies,
			},
			"packages/old/package.json": {
				name: "old",
				dependencies: { catalogued: "catalog:missing" },
			},
			"bun.lock": {
				lockfileVersion: 1,
				workspaces: { "": { dependencies } },
				packages: {
					catalogued: ["catalogued@2.0.0"],
					malformed: ["malformed@1.0.0"],
					unavailable: ["unavailable@1.0.0"],
					slow: ["slow@1.0.0"],
				},
			},
		})
		const result = await cli(
			root,
			`globalThis.fetch = async (url) => {
			if (url.endsWith('/malformed')) return Response.json({versions: {}, 'dist-tags': {latest: '1.0.0'}})
			if (url.endsWith('/unavailable') || url.endsWith('/bun')) return new Response('', {status: 503})
			if (url.endsWith('/slow')) throw new DOMException('Registry request timed out', 'TimeoutError')
			return Response.json(${JSON.stringify(metadata)})
		}`,
		)
		expect(result.status).toBe(1)
		expect(result.stdout).toContain(
			"packages/old dependencies catalogued declared=catalog:missing; UNRESOLVED unsupported declaration",
		)
		expect(result.stdout).toContain(
			"UNRESOLVED registry: Registry returned no valid versions",
		)
		expect(result.stdout).toContain("UNRESOLVED registry: Registry HTTP 503")
		expect(result.stdout).toContain(
			"UNRESOLVED registry: Registry request timed out",
		)
		expect(result.stdout).toContain(
			"packageManager bun declared=1.0.0; UNRESOLVED registry: Registry HTTP 503",
		)
		expect(result.stdout).toContain("Check incomplete.")
	})
})

describe("version comparisons", () => {
	it("keeps declaration policy separate from installed versions", () => {
		const notes = compareUsage(
			{
				name: "shared",
				owner: "",
				section: "dependencies",
				declared: "^1.0.0",
			},
			parseMetadata(metadata),
			"1.0.0",
		)
		expect(notes).toContain("range declaration; exact pin preferred")
		expect(notes).toContain("newer within declaration 1.5.0")
		expect(
			compareUsage(
				{
					name: "shared",
					owner: "",
					section: "dependencies",
					declared: "1.0.0",
				},
				parseMetadata(metadata),
				"2.0.0",
			),
		).toEqual(
			expect.arrayContaining([
				"stable update 2.0.0",
				"locked version is outside declaration",
			]),
		)
	})

	it("orders numeric prereleases and does not call a lower release line newer", () => {
		const notes = compareUsage(
			{
				name: "shared",
				owner: "",
				section: "dependencies",
				declared: "2.1.0-beta.9",
			},
			{
				versions: [
					"1.9.0",
					"2.0.0",
					"2.1.0-beta.9",
					"2.1.0-beta.10",
					"1.10.0-beta.99",
				],
				tags: {
					latest: "2.1.0-beta.10",
					next: "2.1.0-beta.10",
					legacy: "1.10.0-beta.99",
				},
			},
			"2.1.0-beta.9",
		)
		expect(notes).toEqual(
			expect.arrayContaining([
				"stable 2.0.0 is not newer",
				"latest=2.1.0-beta.10 prerelease, newer",
				"next=2.1.0-beta.10 prerelease, newer",
				"legacy=1.10.0-beta.99 prerelease, not newer",
			]),
		)
		expect(notes).not.toContain("stable update 2.0.0")
	})
})

describe("registry metadata", () => {
	it("rejects tags that do not identify a published version", () => {
		expect(() =>
			parseMetadata({
				versions: { "1.0.0": {} },
				"dist-tags": { latest: "2.0.0" },
			}),
		).toThrow("Invalid registry tag latest")
		expect(() =>
			parseMetadata({ versions: { "1.0.0": {} }, "dist-tags": {} }),
		).toThrow("no latest tag")
	})

	it("bounds a scoped package request and propagates timeout failures", async () => {
		const timeout = vi.spyOn(AbortSignal, "timeout")
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new DOMException("Request timed out", "TimeoutError"))
		vi.stubGlobal("fetch", fetch)
		await expect(fetchMetadata("@scope/package")).rejects.toThrow(
			"Request timed out",
		)
		expect(timeout).toHaveBeenCalledWith(15_000)
		expect(fetch).toHaveBeenCalledWith(
			"https://registry.npmjs.org/%40scope%2Fpackage",
			{ signal: expect.any(AbortSignal) },
		)
	})
})
