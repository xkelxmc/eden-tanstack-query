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
					<span className="text-muted-foreground text-sm">
						{user.name ?? "No name"}
					</span>
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
	const [name, setName] = useState("")

	const mutation = useMutation({
		...eden.users.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.users.get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!email.trim()) return
		mutation.mutate({ email, name: name || undefined })
		setEmail("")
		setName("")
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
			<Input
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Name (optional)"
				className="flex-1"
			/>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Creating..." : "Add User"}
			</Button>
		</form>
	)
}

// ============================================================================
// Notifications
// ============================================================================

function NotificationList({ userId }: { userId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const { data, isLoading, error } = useQuery(
		eden.users({ id: userId }).notifications.get.queryOptions(),
	)

	const markRead = useMutation({
		...eden.notifications({ id: "" }).read.put.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.users({ id: userId }).notifications.get.queryKey(),
			}),
	})

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No notifications" />

	return (
		<ul className="space-y-2">
			{data.map((n) => (
				<li
					key={n.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<div className="flex items-center gap-2">
						<span>{n.title}</span>
						{n.read && (
							<Badge variant="outline" className="text-xs">
								Read
							</Badge>
						)}
					</div>
					{!n.read && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => markRead.mutate(undefined, {})}
							disabled={markRead.isPending}
						>
							Mark read
						</Button>
					)}
				</li>
			))}
		</ul>
	)
}

// ============================================================================
// Sessions
// ============================================================================

function SessionList({ userId }: { userId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const { data, isLoading, error } = useQuery(
		eden.users({ id: userId }).sessions.get.queryOptions(),
	)

	const deleteSession = useMutation({
		...eden.sessions({ id: "" }).delete.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.users({ id: userId }).sessions.get.queryKey(),
			}),
	})

	const deleteAll = useMutation({
		...eden.users({ id: userId }).sessions.delete.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.users({ id: userId }).sessions.get.queryKey(),
			}),
	})

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No active sessions" />

	return (
		<div className="space-y-4">
			<Button
				variant="destructive"
				size="sm"
				onClick={() => deleteAll.mutate(undefined)}
				disabled={deleteAll.isPending}
			>
				{deleteAll.isPending ? "Revoking..." : "Revoke All Sessions"}
			</Button>
			<ul className="space-y-2">
				{data.map((s) => (
					<li
						key={s.id}
						className="flex items-center justify-between rounded-md border px-3 py-2"
					>
						<div className="text-sm">
							<div>{s.userAgent}</div>
							<div className="text-muted-foreground">{s.ip}</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={() => deleteSession.mutate(undefined)}
							disabled={deleteSession.isPending}
						>
							Revoke
						</Button>
					</li>
				))}
			</ul>
		</div>
	)
}

// ============================================================================
// API Keys
// ============================================================================

function ApiKeyList({ userId }: { userId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const { data, isLoading, error } = useQuery(
		eden.users({ id: userId })["api-keys"].get.queryOptions(),
	)

	const deleteKey = useMutation({
		...eden["api-keys"]({ id: "" }).delete.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.users({ id: userId })["api-keys"].get.queryKey(),
			}),
	})

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No API keys" />

	return (
		<ul className="space-y-2">
			{data.map((k) => (
				<li
					key={k.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<div className="text-sm">
						<div className="font-medium">{k.name}</div>
						<div className="font-mono text-muted-foreground">
							{k.key.slice(0, 12)}...
						</div>
					</div>
					<Button
						size="sm"
						variant="destructive"
						onClick={() => deleteKey.mutate(undefined)}
						disabled={deleteKey.isPending}
					>
						Delete
					</Button>
				</li>
			))}
		</ul>
	)
}

function CreateApiKey({ userId }: { userId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const [name, setName] = useState("")

	const mutation = useMutation({
		...eden["api-keys"].post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.users({ id: userId })["api-keys"].get.queryKey(),
			}),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim()) return
		mutation.mutate({
			name,
			key: `sk_${crypto.randomUUID()}`,
			userId,
		})
		setName("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Key name"
				className="flex-1"
			/>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Creating..." : "Create API Key"}
			</Button>
		</form>
	)
}

// ============================================================================
// Export
// ============================================================================

export function UsersTab() {
	return (
		<div className="space-y-6">
			<Section title="Create User" description="Add a new user to the system">
				<CreateUser />
			</Section>

			<Section title="All Users" description="List of registered users">
				<UserList />
			</Section>

			<Section title="User Details" description="Detailed view with relations">
				<UserDetail id="user-1" />
			</Section>

			<Separator />

			<Section title="Notifications" description="User notifications (user-1)">
				<NotificationList userId="user-1" />
			</Section>

			<Section title="Sessions" description="Active sessions (user-1)">
				<SessionList userId="user-1" />
			</Section>

			<Section title="API Keys" description="Manage API keys (user-1)">
				<CreateApiKey userId="user-1" />
				<div className="mt-4">
					<ApiKeyList userId="user-1" />
				</div>
			</Section>
		</div>
	)
}
