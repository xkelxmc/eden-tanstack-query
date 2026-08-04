/**
 * Append explicit `.js` extensions to relative specifiers in the emitted
 * declarations so the published artifact resolves under node16/nodenext.
 * Runs after `tsc -p tsconfig.build.json` as part of `build:types`.
 *
 * Why post-emit: source stays extensionless (Bun-first repo, bundler-style
 * resolution everywhere), and TypeScript's `rewriteRelativeImportExtensions`
 * rewrites JS emit only — declaration output keeps the original specifier
 * (verified against typescript 7.0.2). The attw gate in CI enforces that the
 * rewrite stays correct.
 */
import { Glob } from "bun"

const distUrl = new URL("../dist/", import.meta.url)
const specifier = /(from\s*"|import\(\s*")(\.\.?\/[^"]+?)(?=")/g

let rewrites = 0
let touched = 0
for await (const name of new Glob("**/*.d.ts").scan(distUrl.pathname)) {
	const file = Bun.file(new URL(name, distUrl))
	const text = await file.text()
	const next = text.replace(
		specifier,
		(match, prefix: string, spec: string) => {
			if (/\.(?:js|json)$/.test(spec)) return match
			rewrites++
			return `${prefix}${spec}.js`
		},
	)
	if (next !== text) {
		await Bun.write(file, next)
		touched++
	}
}

console.log(
	`fix-dts-extensions: rewrote ${rewrites} specifier(s) in ${touched} file(s)`,
)
