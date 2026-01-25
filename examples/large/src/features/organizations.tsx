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
// Organizations
// ============================================================================

function OrganizationList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(
		eden.organizations.get.queryOptions(),
	)

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No organizations yet" />

	return (
		<ul className="space-y-2">
			{data.map((org) => (
				<li
					key={org.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<span className="font-medium">{org.name}</span>
					<Badge variant="outline">{org.slug}</Badge>
				</li>
			))}
		</ul>
	)
}

function OrganizationDetail({ id }: { id: string }) {
	const eden = useEden()
	const { data, isLoading } = useQuery(
		eden.organizations({ id }).get.queryOptions(),
	)

	if (isLoading) return <LoadingState />
	if (!data) return <EmptyState message="Organization not found" />

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<h3 className="font-semibold">{data.name}</h3>
				<Badge variant="secondary">{data.slug}</Badge>
			</div>
			<div className="text-sm text-muted-foreground">
				Members: {data.members?.length ?? 0}
			</div>
		</div>
	)
}

function CreateOrganization() {
	const eden = useEden()
	const qc = useQueryClient()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")

	const mutation = useMutation({
		...eden.organizations.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: eden.organizations.get.queryKey() }),
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
				placeholder="Organization name"
				className="flex-1"
			/>
			<Input
				value={slug}
				onChange={(e) => setSlug(e.target.value)}
				placeholder="slug"
				className="flex-1"
			/>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Creating..." : "Create Org"}
			</Button>
		</form>
	)
}

// ============================================================================
// Members
// ============================================================================

function MemberList({ orgId }: { orgId: string }) {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(
		eden.organizations({ id: orgId }).members.get.queryOptions(),
	)

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No members yet" />

	return (
		<ul className="space-y-2">
			{data.map((member) => (
				<li
					key={member.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<span>{member.user?.email}</span>
					<Badge>{member.role}</Badge>
				</li>
			))}
		</ul>
	)
}

function CreateMember({ orgId }: { orgId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const [userId, setUserId] = useState("")
	const [role, setRole] = useState("member")

	const mutation = useMutation({
		...eden.members.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.organizations({ id: orgId }).members.get.queryKey(),
			}),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!userId.trim()) return
		mutation.mutate({ userId, organizationId: orgId, role })
		setUserId("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={userId}
				onChange={(e) => setUserId(e.target.value)}
				placeholder="User ID"
				className="flex-1"
			/>
			<select
				value={role}
				onChange={(e) => setRole(e.target.value)}
				className="rounded-md border px-3 py-2 text-sm"
			>
				<option value="member">Member</option>
				<option value="admin">Admin</option>
				<option value="owner">Owner</option>
			</select>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Adding..." : "Add Member"}
			</Button>
		</form>
	)
}

// ============================================================================
// Settings
// ============================================================================

function SettingsForm({ orgId }: { orgId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const { data, isLoading } = useQuery(
		eden.organizations({ id: orgId }).settings.get.queryOptions(),
	)
	const [theme, setTheme] = useState("")
	const [language, setLanguage] = useState("")

	const mutation = useMutation({
		...eden.organizations({ id: orgId }).settings.put.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.organizations({ id: orgId }).settings.get.queryKey(),
			}),
	})

	if (isLoading) return <LoadingState />

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		mutation.mutate({
			theme: theme || undefined,
			language: language || undefined,
		})
	}

	return (
		<div className="space-y-4">
			<div className="flex gap-4 text-sm">
				<span>
					Theme: <Badge variant="outline">{data?.theme ?? "default"}</Badge>
				</span>
				<span>
					Language: <Badge variant="outline">{data?.language ?? "en"}</Badge>
				</span>
			</div>
			<form onSubmit={handleSubmit} className="flex gap-2">
				<select
					value={theme}
					onChange={(e) => setTheme(e.target.value)}
					className="rounded-md border px-3 py-2 text-sm"
				>
					<option value="">Select theme</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
					<option value="system">System</option>
				</select>
				<select
					value={language}
					onChange={(e) => setLanguage(e.target.value)}
					className="rounded-md border px-3 py-2 text-sm"
				>
					<option value="">Select language</option>
					<option value="en">English</option>
					<option value="ru">Russian</option>
					<option value="es">Spanish</option>
				</select>
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Saving..." : "Save Settings"}
				</Button>
			</form>
		</div>
	)
}

// ============================================================================
// Subscription
// ============================================================================

function SubscriptionForm({ orgId }: { orgId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const { data, isLoading } = useQuery(
		eden.organizations({ id: orgId }).subscription.get.queryOptions(),
	)
	const [plan, setPlan] = useState("")

	const mutation = useMutation({
		...eden.organizations({ id: orgId }).subscription.put.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.organizations({ id: orgId }).subscription.get.queryKey(),
			}),
	})

	if (isLoading) return <LoadingState />

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (plan) mutation.mutate({ plan })
	}

	return (
		<div className="space-y-4">
			<div className="flex gap-4 text-sm">
				<span>
					Plan: <Badge>{data?.plan ?? "none"}</Badge>
				</span>
				<span>
					Status: <Badge variant="outline">{data?.status ?? "inactive"}</Badge>
				</span>
			</div>
			<form onSubmit={handleSubmit} className="flex gap-2">
				<select
					value={plan}
					onChange={(e) => setPlan(e.target.value)}
					className="rounded-md border px-3 py-2 text-sm"
				>
					<option value="">Select plan</option>
					<option value="free">Free</option>
					<option value="starter">Starter</option>
					<option value="pro">Pro</option>
					<option value="enterprise">Enterprise</option>
				</select>
				<Button type="submit" disabled={mutation.isPending || !plan}>
					{mutation.isPending ? "Updating..." : "Update Subscription"}
				</Button>
			</form>
		</div>
	)
}

// ============================================================================
// Invoices
// ============================================================================

function InvoiceList({ orgId }: { orgId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const { data, isLoading, error } = useQuery(
		eden.organizations({ id: orgId }).invoices.get.queryOptions(),
	)

	const markPaid = useMutation({
		...eden.invoices({ id: "" }).paid.put.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.organizations({ id: orgId }).invoices.get.queryKey(),
			}),
	})

	if (isLoading) return <LoadingState />
	if (error) return <ErrorState error={error} />
	if (!data?.length) return <EmptyState message="No invoices" />

	return (
		<ul className="space-y-2">
			{data.map((inv) => (
				<li
					key={inv.id}
					className="flex items-center justify-between rounded-md border px-3 py-2"
				>
					<div className="text-sm">
						<span className="font-medium">{inv.number}</span>
						<span className="text-muted-foreground"> — ${inv.amount}</span>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant={inv.status === "paid" ? "default" : "outline"}>
							{inv.status}
						</Badge>
						{inv.status !== "paid" && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => markPaid.mutate(undefined)}
								disabled={markPaid.isPending}
							>
								Mark Paid
							</Button>
						)}
					</div>
				</li>
			))}
		</ul>
	)
}

function CreateInvoice({ orgId }: { orgId: string }) {
	const eden = useEden()
	const qc = useQueryClient()
	const [number, setNumber] = useState("")
	const [amount, setAmount] = useState("")

	const mutation = useMutation({
		...eden.invoices.post.mutationOptions(),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: eden.organizations({ id: orgId }).invoices.get.queryKey(),
			}),
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!number.trim() || !amount.trim()) return
		const dueDate = new Date()
		dueDate.setDate(dueDate.getDate() + 30)
		mutation.mutate({
			number,
			amount: Number.parseFloat(amount),
			organizationId: orgId,
			dueDate,
		})
		setNumber("")
		setAmount("")
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={number}
				onChange={(e) => setNumber(e.target.value)}
				placeholder="Invoice #"
				className="flex-1"
			/>
			<Input
				value={amount}
				onChange={(e) => setAmount(e.target.value)}
				placeholder="Amount"
				type="number"
				className="flex-1"
			/>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Creating..." : "Create Invoice"}
			</Button>
		</form>
	)
}

// ============================================================================
// Export
// ============================================================================

export function OrganizationsTab() {
	return (
		<div className="space-y-6">
			<Section title="Create Organization" description="Add a new organization">
				<CreateOrganization />
			</Section>

			<Section title="All Organizations" description="List of organizations">
				<OrganizationList />
			</Section>

			<Section title="Organization Details" description="Detailed view (org-1)">
				<OrganizationDetail id="org-1" />
			</Section>

			<Separator />

			<Section title="Members" description="Organization members (org-1)">
				<CreateMember orgId="org-1" />
				<div className="mt-4">
					<MemberList orgId="org-1" />
				</div>
			</Section>

			<Section title="Settings" description="Organization settings (org-1)">
				<SettingsForm orgId="org-1" />
			</Section>

			<Section title="Subscription" description="Billing plan (org-1)">
				<SubscriptionForm orgId="org-1" />
			</Section>

			<Section title="Invoices" description="Billing history (org-1)">
				<CreateInvoice orgId="org-1" />
				<div className="mt-4">
					<InvoiceList orgId="org-1" />
				</div>
			</Section>
		</div>
	)
}
