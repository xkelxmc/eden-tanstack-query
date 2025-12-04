import { existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

interface PackageSize {
	name: string
	esm: {
		raw: string
		gzipped: string
	}
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024).toFixed(2)} KB`
}

async function getFileSize(
	filePath: string,
): Promise<{ raw: number; gzipped: number }> {
	if (!existsSync(filePath)) {
		return { raw: 0, gzipped: 0 }
	}

	const file = Bun.file(filePath)
	const content = await file.text()
	const raw = statSync(filePath).size
	const gzipped = gzipSync(content).length

	return { raw, gzipped }
}

async function calculatePackageSize(
	packageName: string,
	distPath: string,
): Promise<PackageSize> {
	const esmPath = join(distPath, "index.js")
	const esm = await getFileSize(esmPath)

	return {
		name: packageName,
		esm: {
			raw: formatBytes(esm.raw),
			gzipped: formatBytes(esm.gzipped),
		},
	}
}

function formatSizeLine(sizes: PackageSize): string {
	return `**Size:** ${sizes.esm.raw} (gzipped: ${sizes.esm.gzipped})`
}

async function updateReadme(
	readmePath: string,
	sizeString: string,
): Promise<boolean> {
	const readmeFile = Bun.file(readmePath)

	if (!(await readmeFile.exists())) {
		return false
	}

	const readmeContent = await readmeFile.text()

	// Pattern: **Size:** X KB (gzipped: Y KB)
	const sizePattern = /\*\*Size:\*\* [\d.]+ KB \(gzipped: [\d.]+ KB\)/g

	const currentSizes = readmeContent.match(sizePattern) || []

	if (currentSizes.length === 0) {
		return false
	}

	// Check if all sizes are already up to date
	const allUpToDate = currentSizes.every((s) => s === sizeString)
	if (allUpToDate) {
		return false
	}

	// Replace all size occurrences
	const newReadmeContent = readmeContent.replace(sizePattern, sizeString)

	await Bun.write(readmePath, newReadmeContent)

	return true
}

async function main() {
	console.log("\n📦 Calculating bundle sizes...\n")

	const size = await calculatePackageSize(
		"@eden-tanstack-query/react",
		"packages/eden-tanstack-query/dist",
	)

	console.log(
		`  ${size.name}: ESM ${size.esm.raw} (gzipped: ${size.esm.gzipped})`,
	)

	const sizeString = formatSizeLine(size)

	// Update both READMEs
	const readmePaths = ["README.md", "packages/eden-tanstack-query/README.md"]

	let updatedCount = 0
	for (const readmePath of readmePaths) {
		const updated = await updateReadme(readmePath, sizeString)
		if (updated) {
			console.log(`  ✅ Updated ${readmePath}`)
			updatedCount++
		}
	}

	if (updatedCount === 0) {
		console.log("\n✅ Bundle sizes are up to date. No changes needed.\n")
	} else {
		console.log(`\n✅ Updated ${updatedCount} file(s) with: ${sizeString}\n`)
	}
}

main().catch((error) => {
	console.error("\n❌ Error:", error.message)
	process.exit(1)
})
