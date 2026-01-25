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
// Posts
// ============================================================================

function PostList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(eden.posts.get.queryOptions())

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No posts yet" />

	return (
		<ul className="space-y-2">
			{data.map((post) => (
				<li key={post.id} className="rounded-md border px-3 py-2">
					<div className="flex items-center justify-between">
						<span className="font-medium">{post.title}</span>
						{post.category && (
							<Badge variant="outline">{post.category.name}</Badge>
						)}
					</div>
					<div className="text-muted-foreground text-sm">
						by {post.author?.name ?? post.author?.email}
					</div>
				</li>
			))}
		</ul>
	)
}

function PostDetail({ id }: { id: string }) {
	const eden = useEden()
	const { data, isLoading } = useQuery(eden.posts({ id }).get.queryOptions())

	if (isLoading) return <LoadingState />
	if (!data) return <EmptyState message="Post not found" />

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-semibold">{data.title}</h3>
				<p className="text-muted-foreground text-sm">by {data.author?.email}</p>
			</div>
			{data.content && <p className="text-sm">{data.content}</p>}
			<div className="flex gap-2">
				{data.tags?.map((t) => (
					<Badge key={t.id} variant="secondary">
						{t.name}
					</Badge>
				))}
			</div>
			<Separator />
			<div>
				<h4 className="mb-2 text-sm font-medium">
					Comments ({data.comments?.length ?? 0})
				</h4>
				{data.comments?.length ? (
					<ul className="space-y-1">
						{data.comments.map((c) => (
							<li key={c.id} className="text-sm text-muted-foreground">
								• {c.text}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-muted-foreground">No comments</p>
				)}
			</div>
		</div>
	)
}

function CreatePost() {
	const eden = useEden()
	const qc = useQueryClient()
	const [title, setTitle] = useState("")
	const [content, setContent] = useState("")
	const [authorId, setAuthorId] = useState("user-1")

	const mutation = useMutation({
		...eden.posts.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.posts.get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!title.trim()) return
		mutation.mutate({ title, content: content || undefined, authorId })
		setTitle("")
		setContent("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<div className="flex gap-2">
				<Input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Post title"
					className="flex-1"
				/>
				<Input
					value={authorId}
					onChange={(e) => setAuthorId(e.target.value)}
					placeholder="Author ID"
					className="w-32"
				/>
			</div>
			<div className="flex gap-2">
				<Input
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Content (optional)"
					className="flex-1"
				/>
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Creating..." : "Create Post"}
				</Button>
			</div>
		</form>
	)
}

// ============================================================================
// Comments
// ============================================================================

function CommentList({ postId }: { postId: string }) {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(
		eden.posts({ id: postId }).comments.get.queryOptions(),
	)

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No comments yet" />

	return (
		<ul className="space-y-2">
			{data.map((comment) => (
				<li key={comment.id} className="rounded-md border px-3 py-2">
					<div>{comment.text}</div>
					<div className="text-muted-foreground text-sm">
						by {comment.author?.email}
					</div>
				</li>
			))}
		</ul>
	)
}

function CreateComment({ postId }: { postId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const [text, setText] = useState("")
	const [authorId, setAuthorId] = useState("user-1")

	const mutation = useMutation({
		...eden.comments.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.posts({ id: postId }).comments.get.queryKey(),
			}),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!text.trim()) return
		mutation.mutate({ text, postId, authorId })
		setText("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Write a comment..."
				className="flex-1"
			/>
			<Input
				value={authorId}
				onChange={(e) => setAuthorId(e.target.value)}
				placeholder="Author ID"
				className="w-32"
			/>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Adding..." : "Comment"}
			</Button>
		</form>
	)
}

// ============================================================================
// Export
// ============================================================================

export function PostsTab() {
	return (
		<div className="space-y-6">
			<Section title="Create Post" description="Write a new post">
				<CreatePost />
			</Section>

			<Section title="All Posts" description="Recent posts">
				<PostList />
			</Section>
		</div>
	)
}

export function PostDetailTab() {
	return (
		<div className="space-y-6">
			<Section
				title="Post Details"
				description="Single post with nested comments (post-1)"
			>
				<PostDetail id="post-1" />
			</Section>

			<Separator />

			<Section title="Comments" description="All comments on post-1">
				<CreateComment postId="post-1" />
				<div className="mt-4">
					<CommentList postId="post-1" />
				</div>
			</Section>
		</div>
	)
}
