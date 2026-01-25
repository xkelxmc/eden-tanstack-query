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
import { Separator } from "@/components/ui/separator"
import { useEden } from "../eden"

// ============================================================================
// Categories
// ============================================================================

function CategoryList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(
		eden.categories.get.queryOptions(),
	)

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No categories yet" />

	return (
		<ul className="space-y-2">
			{data.map((cat) => (
				<li
					key={cat.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<span className="font-medium">{cat.name}</span>
					<Badge variant="outline">{cat.slug}</Badge>
				</li>
			))}
		</ul>
	)
}

function CreateCategory() {
	const eden = useEden()
	const qc = useQueryClient()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")

	const mutation = useMutation({
		...eden.categories.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.categories.get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim() || !slug.trim()) return
		mutation.mutate({ name, slug })
		setName("")
		setSlug("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Category name"
				className="flex-1"
			/>
			<Input
				value={slug}
				onChange={(e) => setSlug(e.target.value)}
				placeholder="slug"
				className="flex-1"
			/>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Creating..." : "Create Category"}
			</Button>
		</form>
	)
}

// ============================================================================
// Tags
// ============================================================================

function TagList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(eden.tags.get.queryOptions())

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No tags yet" />

	return (
		<div className="flex flex-wrap gap-2">
			{data.map((tag) => (
				<Badge key={tag.id} variant="secondary">
					{tag.name}
				</Badge>
			))}
		</div>
	)
}

function CreateTag() {
	const eden = useEden()
	const qc = useQueryClient()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")

	const mutation = useMutation({
		...eden.tags.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.tags.get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim() || !slug.trim()) return
		mutation.mutate({ name, slug })
		setName("")
		setSlug("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Tag name"
				className="flex-1"
			/>
			<Input
				value={slug}
				onChange={(e) => setSlug(e.target.value)}
				placeholder="slug"
				className="flex-1"
			/>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Creating..." : "Create Tag"}
			</Button>
		</form>
	)
}

// ============================================================================
// Export
// ============================================================================

export function ContentTab() {
	return (
		<div className="space-y-6">
			<Section title="Categories" description="Post categories">
				<CreateCategory />
				<div className="mt-4">
					<CategoryList />
				</div>
			</Section>

			<Separator />

			<Section title="Tags" description="Post tags">
				<CreateTag />
				<div className="mt-4">
					<TagList />
				</div>
			</Section>
		</div>
	)
}
