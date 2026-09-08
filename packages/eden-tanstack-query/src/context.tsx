/**
 * React Context & Provider for Eden TanStack Query
 *
 * Provides React context and hooks for sharing Eden client across components.
 * Following tRPC's pattern of factory functions for type safety.
 */

import type { Treaty } from "@elysiajs/eden"
import type { QueryClient } from "@tanstack/react-query"
import type { AnyElysia } from "elysia"
import * as React from "react"

import { createEdenOptionsProxy } from "./proxy/createOptionsProxy"
import type { EdenOptionsProxy } from "./types/decorators"

// ============================================================================
// Provider Props
// ============================================================================

/** Props for EdenProvider component */
export interface EdenProviderProps<TApp extends AnyElysia> {
	/** Eden Treaty client instance */
	client: Treaty.Create<TApp>
	/** @deprecated Unused. Pass the QueryClient to TanStack QueryClientProvider. */
	queryClient?: QueryClient
	/** React children */
	children: React.ReactNode
}

// ============================================================================
// Context Creation Result
// ============================================================================

/** Result of createEdenContext */
export interface CreateEdenContextResult<TApp extends AnyElysia> {
	/** Provider component for wrapping app */
	EdenProvider: React.FC<EdenProviderProps<TApp>>
	/** Hook to get the options proxy */
	useEden: () => EdenOptionsProxy<TApp>
	/** Hook to get the raw Eden client */
	useEdenClient: () => Treaty.Create<TApp>
}

// ============================================================================
// Context Factory
// ============================================================================

/**
 * Creates a set of type-safe provider and consumer hooks for Eden.
 *
 * @example
 * ```tsx
 * import { createEdenContext } from 'eden-tanstack-react-query'
 * import type { App } from './server'
 *
 * const { EdenProvider, useEden, useEdenClient } = createEdenContext<App>()
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
 *   const { data } = useQuery(eden.api.users.get.queryOptions())
 *   return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>
 * }
 * ```
 */
export function createEdenContext<
	TApp extends AnyElysia,
>(): CreateEdenContextResult<TApp> {
	// Create contexts with null defaults
	// Using unknown to allow type-safe access via hooks
	const EdenClientContext = React.createContext<Treaty.Create<TApp> | null>(
		null,
	)
	const EdenProxyContext = React.createContext<EdenOptionsProxy<TApp> | null>(
		null,
	)

	// Provider component
	const EdenProvider: React.FC<EdenProviderProps<TApp>> = (props) => {
		const { client, children } = props

		// Memoize proxy to prevent recreating on every render
		const proxy = React.useMemo(
			() => createEdenOptionsProxy<TApp>({ client }),
			[client],
		)

		return (
			<EdenClientContext.Provider value={client}>
				<EdenProxyContext.Provider value={proxy}>
					{children}
				</EdenProxyContext.Provider>
			</EdenClientContext.Provider>
		)
	}

	EdenProvider.displayName = "EdenProvider"

	// Hook to get options proxy
	function useEden(): EdenOptionsProxy<TApp> {
		const proxy = React.useContext(EdenProxyContext)

		if (!proxy) {
			throw new Error(
				"useEden must be used within an EdenProvider. " +
					"Make sure to wrap your app with <EdenProvider>.",
			)
		}

		return proxy
	}

	// Hook to get raw Eden client
	function useEdenClient(): Treaty.Create<TApp> {
		const client = React.useContext(EdenClientContext)

		if (!client) {
			throw new Error(
				"useEdenClient must be used within an EdenProvider. " +
					"Make sure to wrap your app with <EdenProvider>.",
			)
		}

		return client
	}

	return {
		EdenProvider,
		useEden,
		useEdenClient,
	}
}
