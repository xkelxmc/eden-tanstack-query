import type { ReactNode } from "react"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface SectionProps {
	title: string
	description?: string
	children: ReactNode
}

export function Section({ title, description, children }: SectionProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	)
}

export function LoadingState() {
	return (
		<div className="space-y-2">
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-3/4" />
			<Skeleton className="h-4 w-1/2" />
		</div>
	)
}

export function ErrorState({ error }: { error: unknown }) {
	return (
		<div className="text-destructive text-sm">
			Error: {error instanceof Error ? error.message : String(error)}
		</div>
	)
}

export function EmptyState({ message = "No data" }: { message?: string }) {
	return <div className="text-muted-foreground text-sm">{message}</div>
}
