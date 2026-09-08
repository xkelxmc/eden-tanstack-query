import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query"
import { EdenProvider, edenClient, useEden } from "./eden"

const queryClient = new QueryClient()

function UserList() {
	const eden = useEden()
	const { data, isLoading, error } = useQuery(eden.users.get.queryOptions())

	if (isLoading) return <div>Loading users...</div>
	if (error) {
		const message =
			typeof error.value === "object" &&
			error.value !== null &&
			"message" in error.value
				? String(error.value.message)
				: String(error.value)
		return (
			<div>
				Error ({error.status}): {message}
			</div>
		)
	}

	return (
		<ul>
			{data?.map((user) => (
				<li key={user.id}>{user.name}</li>
			))}
		</ul>
	)
}

function HelloMessage() {
	const eden = useEden()
	const { data, isLoading } = useQuery(eden.hello.get.queryOptions())

	if (isLoading) return <span>Loading...</span>
	return <span>{data?.message}</span>
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<EdenProvider client={edenClient}>
				<div>
					<h1>Eden TanStack Query Example</h1>
					<p>
						<HelloMessage />
					</p>
					<h2>Users</h2>
					<UserList />
				</div>
			</EdenProvider>
		</QueryClientProvider>
	)
}
