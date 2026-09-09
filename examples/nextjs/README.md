# Next.js App Router example

Next.js 16.3.4 with React 19, Elysia, and Eden TanStack Query. The server prefetches a shared reading list. The browser hydrates that cache and invalidates the list after adding an item.

## Run

From the repository root:

```sh
bun install
bun run build
bun run example:nextjs
```

Open http://localhost:3000. The command starts Next.js and a Bun Elysia API on http://127.0.0.1:3001. `bun run build` builds the workspace library that the example imports. Stop both processes with Ctrl+C.

For a production build and server, also from the root:

```sh
bun run build:all
bun run example:nextjs:start
```

The API does not need to run during the build. The page calls `connection()` before prefetching, so Next.js renders it for each incoming request. Next.js commands explicitly use the Bun runtime.

Run repository checks from the root:

```sh
bun run check:fix
bun run unit-test:run
```

## Request flow

- `server/app.ts` owns the Elysia routes and process-local list. `server/index.ts` starts its single API process.
- `lib/eden.server.ts` uses `server-only` and creates a typed options proxy with uncached fetches to the API. It imports the Elysia app type only.
- `app/page.tsx` creates a new QueryClient for every request, prefetches the list, and passes dehydrated state to TanStack Query's native HydrationBoundary.
- `app/providers.tsx` keeps one browser QueryClient and creates fresh instances on the server. `lib/eden.ts` keeps the React context behind a client boundary.
- `app/items.tsx` reads the hydrated query and invalidates its exact list key after a successful mutation. A shared 60-second stale time prevents an immediate refetch after hydration.

Browser requests use the current page origin. Next.js rewrites `/api/*` to the Elysia API. Server prefetches call that same API directly, so subsequent server renders include items added in the browser. The separate API process avoids separate in-memory lists in Next.js server and route bundles.

By default, both the rewrite and server client use `http://127.0.0.1:3001`. To change the local API port, set `API_PORT` and the matching `INTERNAL_API_URL` before running development or production commands. For production, set `INTERNAL_API_URL` during both the build and server startup because Next.js records rewrites at build time. The bundled API binds to loopback and is intended to run beside Next.js on the same machine.

This is public demo data, with no authentication or database. Everyone shares at most 100 items, and restarting the API resets the list. Run a single API process; use persistent storage before adapting this example for a deployed application.

## Try it

Add an item and reload the page. The new item should appear in the server-rendered list as well as the hydrated browser list. Disable JavaScript and reload to inspect the server-rendered content; adding items requires JavaScript.

See the [SSR guide](https://github.com/xkelxmc/eden-tanstack-query/blob/main/apps/docs/content/docs/guides/ssr.mdx) for the individual integration steps.
