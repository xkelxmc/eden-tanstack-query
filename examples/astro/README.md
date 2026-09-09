# Astro SSR with a React island

This example serves an Astro page and an Elysia API from one process. Astro prefetches the list with `createEdenOptionsProxy`, then passes the dehydrated cache to a React island. Adding an item invalidates the list query.

## Run

Run these commands from the repository root with Bun installed:

```sh
bun install
bun run build
bun run example:astro
```

Open http://localhost:4321. No environment variables or database setup are required for this example. The workspace install also runs the existing examples' Prisma generation.

To build and run the standalone server:

```sh
bun run --filter=@eden-tanstack-query/example-astro build
HOST=127.0.0.1 PORT=4321 bun run --filter=@eden-tanstack-query/example-astro start
```

The official `@astrojs/node` adapter serves the page, `/api/items`, and built client assets. Its generated entry runs under Bun. See Astro's [Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/) and [Bun recipe](https://docs.astro.build/en/recipes/bun/).

The Vite config bundles server dependencies during builds so the standalone entry does not depend on hoisted transitive packages. Development keeps Vite's normal dependency handling for CommonJS modules.

For the workspace checks, run `bun run check:fix` from the root. This includes `astro check`. The example pins TypeScript 6 because `@astrojs/check` supports TypeScript 5 and 6; the root uses TypeScript 7.

The local `tsconfig.json` resolves Elysia to one copy because Bun installs separate copies for the two TypeScript peer versions. Without that mapping, Elysia's private class fields make the app and library types incompatible.

## Request and hydration flow

`src/pages/index.astro` creates a new QueryClient for every request. Its Treaty client calls the Elysia app in-process, so prefetching needs no network request back to the server. After prefetching, Astro serializes `dehydrate(queryClient)` into the island's props and clears the request cache.

`src/components/Items.tsx` contains QueryClientProvider, EdenProvider, HydrationBoundary, and the list in one `client:load` island. The browser keeps its QueryClient and Treaty client stable with lazy state initializers. The React SSR pass gets a separate local QueryClient and reads the supplied hydration state.

Both prefetching and `useQuery` use `api.items.get.queryOptions()`, so the query keys match. The shared 60-second stale time keeps hydration from immediately fetching the list again. Later stale queries can refetch normally. A successful mutation awaits list invalidation before leaving the pending state.

Separate Astro islands have separate React trees. Context from a provider in one island does not wrap another island. Keep these providers and their consumers together, as shown here. See Astro's [framework component guide](https://docs.astro.build/en/guides/framework-components/).

Only the Astro page and API route import the Elysia app at runtime. The React modules import its type only. The browser calls the current origin; no server URL or server implementation is passed in props.

## Demo storage

All visitors share an in-memory list. It resets on restart and works only within one server process. Multiple replicas would each have their own list. There is no authentication or private user data.

The list holds at most 100 items, including the initial entries. Further additions return HTTP 409 until the server restarts. Add authentication and request rate limits before exposing this demo as a public service.

The page and API responses use `Cache-Control: no-store` so HTTP caches do not serve an old list. The API route requires the request's Origin to match the page origin for mutations. This also means a command-line POST must supply the matching Origin header. Deploy the page and API together and preserve the public request origin when configuring a reverse proxy.
