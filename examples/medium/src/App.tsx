import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EdenProvider, edenClient, useEden } from "./eden"

const queryClient = new QueryClient()

// ============================================================================
// Users
// ============================================================================

function UserList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(eden.users.get.queryOptions())

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No users yet" />

	return (
		<ul className="space-y-2">
			{data.map((user) => (
				<li
					key={user.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<span className="font-medium">{user.email}</span>
					<span className="text-muted-foreground text-sm">{user.name}</span>
				</li>
			))}
		</ul>
	)
}

function UserDetail({ id }: { id: string }) {
	const eden = useEden()
	const { data, isLoading } = useQuery(eden.users({ id }).get.queryOptions())

	if (isLoading) return <LoadingState />
	if (!data) return <EmptyState message="User not found" />

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<h3 className="font-semibold">{data.name || "Unnamed"}</h3>
				<Badge variant="secondary">{data.email}</Badge>
			</div>
			<div className="flex gap-4 text-sm text-muted-foreground">
				<span>Posts: {data.posts?.length ?? 0}</span>
				<span>Comments: {data.comments?.length ?? 0}</span>
			</div>
		</div>
	)
}

function CreateUser() {
	const eden = useEden()
	const qc = useQueryClient()
	const [email, setEmail] = useState("")

	const createMutation = useMutation({
		...eden.users.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.users.get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!email.trim()) return
		createMutation.mutate({ email })
		setEmail("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="user@example.com"
				type="email"
				className="flex-1"
			/>
			<Button type="submit" disabled={createMutation.isPending}>
				{createMutation.isPending ? "Creating..." : "Add User"}
			</Button>
		</form>
	)
}

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
					<div className="font-medium">{post.title}</div>
					<div className="text-muted-foreground text-sm">
						by {post.author?.email}
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

	const createMutation = useMutation({
		...eden.posts.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.posts.get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!title.trim()) return
		createMutation.mutate({ title, authorId: "user-1" })
		setTitle("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Post title"
				className="flex-1"
			/>
			<Button type="submit" disabled={createMutation.isPending}>
				{createMutation.isPending ? "Creating..." : "Add Post"}
			</Button>
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

	const createMutation = useMutation({
		...eden.comments.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.posts({ id: postId }).comments.get.queryKey(),
			}),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!text.trim()) return
		createMutation.mutate({ text, postId, authorId: "user-1" })
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
			<Button type="submit" disabled={createMutation.isPending}>
				{createMutation.isPending ? "Adding..." : "Comment"}
			</Button>
		</form>
	)
}

// ============================================================================
// Main App
// ============================================================================

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={edenClient} queryClient={queryClient}>
				<div className="min-h-screen bg-background">
					<div className="mx-auto max-w-4xl p-6">
						<header className="mb-8">
							<h1 className="text-3xl font-bold">Eden TanStack Query</h1>
							<p className="text-muted-foreground">
								Type-safe API client with TanStack Query integration
							</p>
						</header>

						<Tabs defaultValue="users" className="space-y-6">
							<TabsList>
								<TabsTrigger value="users">Users</TabsTrigger>
								<TabsTrigger value="posts">Posts</TabsTrigger>
								<TabsTrigger value="post-detail">Post Detail</TabsTrigger>
								<TabsTrigger value="comments">Comments</TabsTrigger>
							</TabsList>

							<TabsContent value="users" className="space-y-6">
								<Section
									title="Create User"
									description="Add a new user to the system"
								>
									<CreateUser />
								</Section>

								<Section
									title="All Users"
									description="List of registered users"
								>
									<UserList />
								</Section>

								<Section
									title="User Details"
									description="Detailed view with relations"
								>
									<UserDetail id="user-1" />
								</Section>
							</TabsContent>

							<TabsContent value="posts" className="space-y-6">
								<Section title="Create Post" description="Write a new post">
									<CreatePost />
								</Section>

								<Section title="All Posts" description="Recent posts">
									<PostList />
								</Section>
							</TabsContent>

							<TabsContent value="post-detail" className="space-y-6">
								<Section
									title="Post Details"
									description="Single post with nested comments"
								>
									<PostDetail id="post-1" />
								</Section>
							</TabsContent>

							<TabsContent value="comments" className="space-y-6">
								<Section title="Add Comment" description="Comment on post-1">
									<CreateComment postId="post-1" />
								</Section>

								<Section title="Comments" description="All comments on post-1">
									<CommentList postId="post-1" />
								</Section>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</EdenProvider>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}
