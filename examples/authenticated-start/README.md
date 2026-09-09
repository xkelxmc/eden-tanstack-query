# Authenticated TanStack Start example

A small cookie-session demo with Elysia, Eden TanStack Query, and TanStack Start. Alice and Bob each have a protected list. The login buttons select fictional identities without passwords. This is not production authentication.

## Run

From the repository root:

```sh
bun install
bun run --filter=eden-tanstack-react-query build
bun run example:authenticated-start
```

Open <http://localhost:3002>. Choose Alice, follow **About this demo**, then return to the list. Choose Bob or log out. A session change reloads the document to discard both Router and Query caches. Ordinary links use client navigation. Switching identity or logging out broadcasts the change to other open tabs, which clear their caches and reload too. If browser messaging is unavailable, the current tab still reloads; reload other tabs manually after switching identity.

Build and run the same application as one Bun server:

```sh
bun run --filter=eden-tanstack-react-query build
bun run --filter=@eden-tanstack-query/example-authenticated-start build
PORT=3002 bun run --filter=@eden-tanstack-query/example-authenticated-start start
```

Use `localhost` for local production testing. Production cookies have `Secure`; browsers treat localhost as a secure context even over HTTP. A deployed server must use HTTPS. Serve the Start pages and `/api/*` under one origin, preserving the public URL through any reverse proxy. No separate API server or CORS configuration is needed.

## Request and cache ownership

- `src/routes/api.$.ts` sends browser requests to the server-only Elysia application.
- `src/lib/client.ts` creates a Treaty client for the current SSR request. Only that request's cookie is forwarded, directly to `api.handle`. There is no internal HTTP host to configure and no shared credential-bearing client. The browser uses same-origin cookies.
- `getRouter` creates a QueryClient for each server request. Start retains the router and its QueryClient across browser renders and navigation. Its Eden proxy lives in router context, outside dehydrated query data.
- The list loader awaits `ensureQueryData` using Eden's generated options. The component uses the same options and query key. Native `setupRouterSsrQueryIntegration` hydrates the cache; a 60-second stale time prevents an immediate duplicate request.
- Every dynamic response uses `Cache-Control: private, no-store` and varies on Cookie. Do not prerender these pages or put their HTML, API responses, or dehydrated query state into a shared cache.
- Session changes hide the list, cancel pending queries, rotate or revoke the session token, clear the QueryClient, and replace the document. No cache persistence is configured.
- The list page polls the session every minute while visible, hiding the private list when the server reports that the session has expired.

The server stores up to 1,000 opaque random session tokens in memory. Login removes expired sessions and returns HTTP 503 when the store is full; existing sessions can still rotate or log out. Cookies are HttpOnly, SameSite=Lax, and expire after one hour. Login and logout reject requests whose Origin does not match the request URL. Session tokens never enter query keys, loader data, or the rendered page.

Run a single server instance. Restarting it clears all sessions; multiple instances do not share sessions. A production application needs an actual authentication flow and a persistent shared session store. This example deliberately has neither real credentials nor a database.

The SSR integration is pinned to `@tanstack/react-router-ssr-query@1.167.1`, which supports the workspace's Query 5.101.4. Later integration releases require Query 5.102 or newer.

See the [native TanStack Query integration](https://tanstack.com/router/latest/docs/integrations/query) and [Start server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).
