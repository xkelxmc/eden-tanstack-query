import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<div>
				<h1>Eden TanStack Query Example</h1>
				<p>Library integration will be added after core package is complete.</p>
			</div>
		</QueryClientProvider>
	)
}
