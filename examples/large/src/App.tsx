import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EdenProvider, edenClient } from "./eden"
import { AuditTab } from "./features/audit"
import { ContentTab } from "./features/content"
import { FilesTab } from "./features/files"
import { OrganizationsTab } from "./features/organizations"
import { PostDetailTab, PostsTab } from "./features/posts"
import { UsersTab } from "./features/users"

const queryClient = new QueryClient()

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={edenClient} queryClient={queryClient}>
				<div className="min-h-screen bg-background">
					<div className="mx-auto max-w-4xl p-6">
						<header className="mb-8">
							<h1 className="text-3xl font-bold">Eden TanStack Query</h1>
							<p className="text-muted-foreground">
								Large example with multiple entities and relations
							</p>
						</header>

						<Tabs defaultValue="users" className="space-y-6">
							<TabsList className="flex-wrap">
								<TabsTrigger value="users">Users</TabsTrigger>
								<TabsTrigger value="organizations">Organizations</TabsTrigger>
								<TabsTrigger value="posts">Posts</TabsTrigger>
								<TabsTrigger value="post-detail">Post Detail</TabsTrigger>
								<TabsTrigger value="content">Content</TabsTrigger>
								<TabsTrigger value="files">Files</TabsTrigger>
								<TabsTrigger value="audit">Audit</TabsTrigger>
							</TabsList>

							<TabsContent value="users">
								<UsersTab />
							</TabsContent>

							<TabsContent value="organizations">
								<OrganizationsTab />
							</TabsContent>

							<TabsContent value="posts">
								<PostsTab />
							</TabsContent>

							<TabsContent value="post-detail">
								<PostDetailTab />
							</TabsContent>

							<TabsContent value="content">
								<ContentTab />
							</TabsContent>

							<TabsContent value="files">
								<FilesTab />
							</TabsContent>

							<TabsContent value="audit">
								<AuditTab />
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</EdenProvider>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}
