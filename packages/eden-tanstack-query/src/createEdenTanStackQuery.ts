/**
 * Main Factory for Eden TanStack Query
 *
 * Creates the complete set of typed hooks and components for using
 * Eden with TanStack Query in React applications.
 */
import type { AnyElysia } from "elysia"

import { type CreateEdenContextResult, createEdenContext } from "./context"

// ============================================================================
// Factory Result Type
// ============================================================================

/** Result of createEdenTanStackQuery */
export interface CreateEdenTanStackQueryResult<TApp extends AnyElysia>
	extends CreateEdenContextResult<TApp> {}

// ============================================================================
// Main Factory
// ============================================================================

/**
 * Creates a complete set of typed utilities for using Eden with TanStack Query.
 *
 * This is the main entry point for setting up Eden TanStack Query in your app.
 * It returns a provider component and hooks that are fully typed based on your
 * Elysia app definition.
 *
 * @example
 * ```tsx
 * import { treaty } from '@elysiajs/eden'
 * import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
 * import { createEdenTanStackQuery } from 'eden-tanstack-react-query'
 * import type { App } from './server'
 *
 * // Create typed hooks and provider
 * const { EdenProvider, useEden, useEdenClient } = createEdenTanStackQuery<App>()
 *
 * // Setup clients
 * const queryClient = new QueryClient()
 * const edenClient = treaty<App>('http://localhost:3000')
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <EdenProvider client={edenClient}>
 *         <UserList />
 *       </EdenProvider>
 *     </QueryClientProvider>
 *   )
 * }
 *
 * function UserList() {
 *   const eden = useEden()
 *
 *   // Fully typed query options
 *   const { data } = useQuery(eden.api.users.get.queryOptions())
 *
 *   return (
 *     <ul>
 *       {data?.map(user => (
 *         <li key={user.id}>{user.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 *
 * @template TApp - The Elysia application type
 * @returns Provider component and typed hooks
 */
export function createEdenTanStackQuery<
	TApp extends AnyElysia,
>(): CreateEdenTanStackQueryResult<TApp> {
	return createEdenContext<TApp>()
}
