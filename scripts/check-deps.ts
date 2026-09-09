import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import {
	gt,
	maxSatisfying,
	prerelease,
	rcompare,
	satisfies,
	valid,
	validRange,
} from "semver"

const sections = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
]
export type Usage = {
	name: string
	owner: string
	section: string
	declared: string
	workspaceName?: string
}
export type Manifest = { path: string; data: unknown }
export type Metadata = { versions: string[]; tags: Record<string, string> }

function record(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		throw new Error("Expected an object")
	return Object.fromEntries(Object.entries(value))
}

export function collectUsages(manifests: Manifest[]) {
	const usages: Usage[] = []
	for (const { path, data } of manifests) {
		const manifest = record(data)
		for (const section of sections) {
			for (const [name, declared] of Object.entries(
				record(manifest[section] ?? {}),
			)) {
				if (typeof declared !== "string")
					throw new Error(`${path}: ${section}.${name} must be a string`)
				usages.push({
					name,
					owner: path === "package.json" ? "" : dirname(path),
					section,
					declared,
					workspaceName:
						typeof manifest.name === "string" ? manifest.name : undefined,
				})
			}
		}
	}
	return usages
}

export async function discoverManifests(root: string) {
	const data: unknown = JSON.parse(
		await readFile(join(root, "package.json"), "utf8"),
	)
	const patterns = record(data).workspaces ?? []
	if (
		!Array.isArray(patterns) ||
		patterns.some(
			(pattern) => typeof pattern !== "string" || pattern.startsWith("!"),
		)
	)
		throw new Error("Only positive Bun workspace glob arrays are supported")
	const paths = new Set(["package.json"])
	for (const pattern of patterns) {
		for await (const path of new Bun.Glob(`${pattern}/package.json`).scan({
			cwd: root,
			onlyFiles: true,
		})) {
			if (!path.split("/").includes("node_modules")) paths.add(path)
		}
	}
	return Promise.all(
		[...paths].sort().map(async (path) => {
			const manifest: unknown =
				path === "package.json"
					? data
					: JSON.parse(await readFile(join(root, path), "utf8"))
			return { path, data: manifest }
		}),
	)
}

export function parseLock(text: string) {
	const lock = record(Bun.JSONC.parse(text))
	if (lock.lockfileVersion !== 1)
		throw new Error("Unsupported bun.lock version")
	return {
		workspaces: record(lock.workspaces),
		packages: record(lock.packages),
	}
}

export function lockedVersion(
	lock: ReturnType<typeof parseLock>,
	usage: Usage,
) {
	const workspace = record(lock.workspaces[usage.owner])
	const declarations = record(workspace[usage.section] ?? {})
	if (declarations[usage.name] !== usage.declared)
		throw new Error("bun.lock declaration differs from manifest")
	const keys =
		usage.owner && usage.workspaceName
			? [`${usage.workspaceName}/${usage.name}`, usage.name]
			: [usage.name]
	for (const key of keys) {
		const entry = lock.packages[key]
		if (entry === undefined) continue
		if (
			!Array.isArray(entry) ||
			typeof entry[0] !== "string" ||
			!entry[0].startsWith(`${usage.name}@`)
		)
			throw new Error(`Unsupported bun.lock entry ${key}`)
		const version = valid(entry[0].slice(usage.name.length + 1))
		if (!version) throw new Error(`Unsupported bun.lock resolution ${key}`)
		return version
	}
	if (usage.section === "peerDependencies") return undefined
	throw new Error("No bun.lock resolution")
}

export function parseMetadata(value: unknown): Metadata {
	const body = record(value)
	const versions = Object.keys(record(body.versions)).filter((version) =>
		valid(version),
	)
	if (!versions.length) throw new Error("Registry returned no valid versions")
	const tags: Record<string, string> = {}
	for (const [tag, version] of Object.entries(record(body["dist-tags"]))) {
		if (
			typeof version !== "string" ||
			!valid(version) ||
			!versions.includes(version)
		)
			throw new Error(`Invalid registry tag ${tag}`)
		tags[tag] = version
	}
	if (!tags.latest) throw new Error("Registry returned no latest tag")
	return { versions, tags }
}

export async function fetchMetadata(name: string) {
	const response = await fetch(
		`https://registry.npmjs.org/${encodeURIComponent(name)}`,
		{ signal: AbortSignal.timeout(15_000) },
	)
	if (!response.ok) throw new Error(`Registry HTTP ${response.status}`)
	return parseMetadata(await response.json())
}

export function compareUsage(
	usage: Usage,
	metadata: Metadata,
	locked?: string,
) {
	const stable = metadata.versions
		.filter((version) => prerelease(version) === null)
		.sort(rcompare)[0]
	const exact = valid(usage.declared)
	const peer = usage.section === "peerDependencies"
	const notes: string[] = []
	if (peer) {
		if (stable)
			notes.push(
				`peer support ${satisfies(stable, usage.declared) ? "includes" : "excludes"} stable ${stable}; compatibility requires testing`,
			)
	} else {
		if (!exact) notes.push("range declaration; exact pin preferred")
		const baseline = exact ?? locked
		if (stable && baseline)
			notes.push(
				gt(stable, baseline)
					? `stable update ${stable}`
					: `stable ${stable} is not newer`,
			)
		const allowed = maxSatisfying(metadata.versions, usage.declared)
		if (allowed && locked && gt(allowed, locked))
			notes.push(`newer within declaration ${allowed}`)
	}
	if (locked && !satisfies(locked, usage.declared))
		notes.push("locked version is outside declaration")
	if (locked && !metadata.versions.includes(locked))
		notes.push("locked version missing from registry metadata")
	for (const [tag, version] of Object.entries(metadata.tags).sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		if (tag !== "latest" && prerelease(version) === null) continue
		const baseline = exact ?? locked
		const comparison = baseline
			? gt(version, baseline)
				? "newer"
				: "not newer"
			: "uncompared"
		notes.push(
			`${tag}=${version} ${prerelease(version) === null ? "stable" : "prerelease"}, ${comparison}`,
		)
	}
	return notes
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error)
}

export async function checkDependencies(
	root: string,
	options: {
		fetchMetadata?: (name: string) => Promise<Metadata>
		concurrency?: number
	} = {},
) {
	const manifests = await discoverManifests(root)
	const usages = collectUsages(manifests)
	const rootManifest = record(
		manifests.find((manifest) => manifest.path === "package.json")?.data,
	)
	const lines: string[] = []
	let incomplete = false
	let lock: ReturnType<typeof parseLock> | undefined
	try {
		lock = parseLock(await readFile(join(root, "bun.lock"), "utf8"))
	} catch (error) {
		incomplete = true
		lines.push(`UNRESOLVED bun.lock: ${errorMessage(error)}`)
	}
	const pm =
		typeof rootManifest.packageManager === "string"
			? /^bun@(.+)$/.exec(rootManifest.packageManager)
			: null
	if (!pm?.[1] || !valid(pm[1])) {
		incomplete = true
		lines.push("UNRESOLVED packageManager: expected bun@<exact version>")
	} else
		usages.push({
			name: "bun",
			owner: "",
			section: "packageManager",
			declared: pm[1],
		})
	const remote = usages.filter((usage) => validRange(usage.declared) !== null)
	const names = [...new Set(remote.map((usage) => usage.name))].sort()
	const results = new Map<string, Metadata | Error>()
	let cursor = 0
	const concurrency = options.concurrency ?? 8
	if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)
		throw new Error("Concurrency must be between 1 and 16")
	await Promise.all(
		Array.from({ length: Math.min(concurrency, names.length) }, async () => {
			while (cursor < names.length) {
				const name = names[cursor++]
				if (!name) continue
				try {
					results.set(
						name,
						await (options.fetchMetadata ?? fetchMetadata)(name),
					)
				} catch (error) {
					results.set(name, new Error(errorMessage(error)))
				}
			}
		}),
	)
	const workspaceNames = new Set(manifests.map(({ data }) => record(data).name))
	for (const usage of usages) {
		const label = `${usage.owner || "<root>"} ${usage.section} ${usage.name} declared=${usage.declared}`
		if (
			usage.declared.startsWith("workspace:") &&
			workspaceNames.has(usage.name)
		) {
			lines.push(`${label}; local workspace`)
			continue
		}
		if (!validRange(usage.declared)) {
			incomplete = true
			lines.push(`${label}; UNRESOLVED unsupported declaration`)
			continue
		}
		let locked: string | undefined
		let lockNote =
			usage.section === "packageManager" ? "" : "; locked=unresolved"
		if (lock && usage.section !== "packageManager") {
			try {
				locked = lockedVersion(lock, usage)
				lockNote = `; locked=${locked ?? "not installed, peer only"}`
			} catch (error) {
				incomplete = true
				lockNote = `; UNRESOLVED lock: ${errorMessage(error)}`
			}
		}
		const metadata = results.get(usage.name)
		if (!metadata || metadata instanceof Error) {
			incomplete = true
			lines.push(
				`${label}${lockNote}; UNRESOLVED registry: ${metadata?.message ?? "missing result"}`,
			)
			continue
		}
		lines.push(
			`${label}${lockNote}; ${compareUsage(usage, metadata, locked).join("; ")}`,
		)
	}
	lines.push(
		`${manifests.length} manifests, ${usages.length} usages, ${names.length} registry lookups. ${incomplete ? "Check incomplete." : "Check complete. Updates are informational."}`,
	)
	return { lines, incomplete }
}

if (import.meta.main) {
	try {
		const result = await checkDependencies(process.cwd())
		console.log(result.lines.join("\n"))
		process.exitCode = result.incomplete ? 1 : 0
	} catch (error) {
		console.error(`Check incomplete: ${errorMessage(error)}`)
		process.exitCode = 1
	}
}
