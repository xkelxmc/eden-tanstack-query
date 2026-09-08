import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const scriptPath = join(process.cwd(), "scripts/update-sizes.ts")
const packagePath = "packages/eden-tanstack-query"
const readmePaths = ["README.md", `${packagePath}/README.md`]
const oldSize = "**Size:** 99.00 KB (gzipped: 88.00 KB)"
const originalReadme = Buffer.from(`# Fixture\r\n${oldSize}\r\n`)
let fixturePath: string

beforeEach(() => {
	fixturePath = mkdtempSync(join(tmpdir(), "update-sizes-"))
	mkdirSync(join(fixturePath, packagePath, "dist"), { recursive: true })
	writeFileSync(
		join(fixturePath, packagePath, "package.json"),
		JSON.stringify({ version: "1.2.3" }),
	)
	for (const readmePath of readmePaths) {
		writeFileSync(join(fixturePath, readmePath), originalReadme)
	}
})

afterEach(() => {
	rmSync(fixturePath, { recursive: true, force: true })
})

test("fails without a bundle and preserves both READMEs byte for byte", () => {
	const result = spawnSync("bun", [scriptPath], {
		cwd: fixturePath,
		encoding: "utf8",
		timeout: 10_000,
	})

	expect(result.error).toBeUndefined()
	expect(result.status).toBe(1)
	for (const readmePath of readmePaths) {
		expect(readFileSync(join(fixturePath, readmePath))).toEqual(originalReadme)
	}
})

test("updates both READMEs with bundle sizes", () => {
	const bundle = Buffer.from('export const message = "hello";\n'.repeat(100))
	writeFileSync(join(fixturePath, packagePath, "dist/index.js"), bundle)
	const result = spawnSync("bun", [scriptPath], {
		cwd: fixturePath,
		encoding: "utf8",
		timeout: 10_000,
	})

	expect(result.error).toBeUndefined()
	expect(result.status, result.stderr).toBe(0)
	const size = (bundle.length / 1024).toFixed(2)
	const updatedReadme = readFileSync(join(fixturePath, "README.md"), "utf8")
	const gzipped = Number(updatedReadme.match(/gzipped: ([\d.]+) KB/)?.[1])
	expect(gzipped).toBeGreaterThan(0)
	expect(gzipped).toBeLessThan(bundle.length / 1024)
	const expectedReadme = originalReadme
		.toString()
		.replace(
			oldSize,
			`**Size:** ${size} KB (gzipped: ${gzipped.toFixed(2)} KB)`,
		)
	for (const readmePath of readmePaths) {
		expect(readFileSync(join(fixturePath, readmePath), "utf8")).toBe(
			expectedReadme,
		)
	}
})
