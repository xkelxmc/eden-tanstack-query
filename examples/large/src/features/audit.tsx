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
// Audit Logs
// ============================================================================

function AuditLogList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(
		eden["audit-logs"].get.queryOptions(),
	)

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No audit logs" />

	return (
		<ul className="space-y-2">
			{data.map((log) => (
				<li
					key={log.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<div className="flex items-center gap-2">
						<Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
						<span className="text-sm">
							{log.entity}:{log.entityId}
						</span>
					</div>
					<span className="text-sm text-muted-foreground">by {log.userId}</span>
				</li>
			))}
		</ul>
	)
}

function getActionVariant(action: string) {
	switch (action) {
		case "create":
			return "default" as const
		case "update":
			return "secondary" as const
		case "delete":
			return "destructive" as const
		default:
			return "outline" as const
	}
}

function CreateAuditLog() {
	const eden = useEden()
	const qc = useQueryClient()
	const [action, setAction] = useState("")
	const [entity, setEntity] = useState("")
	const [entityId, setEntityId] = useState("")
	const [userId, setUserId] = useState("user-1")

	const mutation = useMutation({
		...eden["audit-logs"].post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden["audit-logs"].get.queryKey() }),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!action.trim() || !entity.trim() || !entityId.trim()) return
		mutation.mutate({ action, entity, entityId, userId })
		setAction("")
		setEntity("")
		setEntityId("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<div className="flex gap-2">
				<select
					value={action}
					onChange={(e) => setAction(e.target.value)}
					className="rounded-md border px-3 py-2 text-sm"
				>
					<option value="">Select action</option>
					<option value="create">Create</option>
					<option value="update">Update</option>
					<option value="delete">Delete</option>
				</select>
				<Input
					value={entity}
					onChange={(e) => setEntity(e.target.value)}
					placeholder="Entity (user, post, etc)"
					className="flex-1"
				/>
			</div>
			<div className="flex gap-2">
				<Input
					value={entityId}
					onChange={(e) => setEntityId(e.target.value)}
					placeholder="Entity ID"
					className="flex-1"
				/>
				<Input
					value={userId}
					onChange={(e) => setUserId(e.target.value)}
					placeholder="User ID"
					className="w-32"
				/>
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Logging..." : "Add Log"}
				</Button>
			</div>
		</form>
	)
}

// ============================================================================
// Export
// ============================================================================

export function AuditTab() {
	return (
		<div className="space-y-6">
			<Section title="Create Audit Log" description="Manually log an action">
				<CreateAuditLog />
			</Section>

			<Section title="Audit Logs" description="System activity log">
				<AuditLogList />
			</Section>
		</div>
	)
}
