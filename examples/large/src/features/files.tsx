import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
	EmptyState,
	ErrorState,
	LoadingState,
	Section,
} from "@/components/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEden } from "../eden"

// ============================================================================
// Files
// ============================================================================

function FileList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(eden.files.get.queryOptions())

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No files yet" />

	return (
		<ul className="space-y-2">
			{data.map((f) => (
				<li
					key={f.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<div>
						<div className="font-medium">{f.name}</div>
						<div className="text-sm text-muted-foreground">{f.mimeType}</div>
					</div>
					<Badge variant="outline">{formatBytes(f.size)}</Badge>
				</li>
			))}
		</ul>
	)
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function CreateFile() {
	const eden = useEden()
	const qc = useQueryClient()
	const [name, setName] = useState("")
	const [url, setUrl] = useState("")
	const [mimeType, setMimeType] = useState("application/octet-stream")
	const [size, setSize] = useState("0")
	const [userId, setUserId] = useState("user-1")

	const mutation = useMutation({
		...eden.files.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.files.get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim() || !url.trim()) return
		mutation.mutate({
			name,
			url,
			mimeType,
			size: Number.parseInt(size, 10),
			userId,
		})
		setName("")
		setUrl("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<div className="flex gap-2">
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="File name"
					className="flex-1"
				/>
				<Input
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="URL"
					className="flex-1"
				/>
			</div>
			<div className="flex gap-2">
				<Input
					value={mimeType}
					onChange={(e) => setMimeType(e.target.value)}
					placeholder="MIME type"
					className="flex-1"
				/>
				<Input
					value={size}
					onChange={(e) => setSize(e.target.value)}
					placeholder="Size (bytes)"
					type="number"
					className="w-32"
				/>
				<Input
					value={userId}
					onChange={(e) => setUserId(e.target.value)}
					placeholder="User ID"
					className="w-32"
				/>
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Uploading..." : "Add File"}
				</Button>
			</div>
		</form>
	)
}

// ============================================================================
// Export
// ============================================================================

export function FilesTab() {
	return (
		<div className="space-y-6">
			<Section title="Upload File" description="Add a new file record">
				<CreateFile />
			</Section>

			<Section title="All Files" description="Uploaded files">
				<FileList />
			</Section>
		</div>
	)
}
