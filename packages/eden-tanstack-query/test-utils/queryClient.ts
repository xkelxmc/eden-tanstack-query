import { QueryClient } from "@tanstack/react-query"

/**
 * Creates a QueryClient configured for testing.
 * - Disables retries for faster test failures
 */
export function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})
}
