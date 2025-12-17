# eden-tanstack-react-query

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://github.com/xkelxmc/eden-tanstack-query/actions/workflows/test.yml/badge.svg)](https://github.com/xkelxmc/eden-tanstack-query/actions/workflows/test.yml)

Type-safe TanStack Query integration for Elysia Eden. Like @trpc/react-query, but for Elysia.

**Size:** 9.76 KB (gzipped: 2.42 KB)

## ✨ Features

- **End-to-end type safety** - Full TypeScript inference from Elysia routes
- **Native TanStack Query patterns** - Use standard `useQuery`, `useMutation`, `useInfiniteQuery`
- **Query options factories** - `queryOptions()`, `mutationOptions()`, `infiniteQueryOptions()`
- **Automatic query key generation** - Type-safe keys derived from route paths
- **Path parameter support** - `eden.users({ id: '1' }).get.queryOptions()`
- **Query invalidation helpers** - `queryFilter()` for cache management

## 📦 Installation

```bash
bun add eden-tanstack-react-query @tanstack/react-query @elysiajs/eden
```

## 🚀 Quick Start

### 1. Define your Elysia server

```typescript
// server.ts
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/users', () => [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ])
  .get('/users/:id', ({ params }) => ({
    id: params.id,
    name: `User ${params.id}`
  }))
  .post('/users', ({ body }) => ({
    id: String(Date.now()),
    ...body
  }), {
    body: t.Object({ name: t.String() })
  })
  .listen(3000)

export type App = typeof app
```

### 2. Create typed hooks

```typescript
// lib/eden.ts
import { createEdenTanStackQuery } from 'eden-tanstack-react-query'
import { treaty } from '@elysiajs/eden'
import type { App } from './server'

export const { EdenProvider, useEden, useEdenClient } = createEdenTanStackQuery<App>()
export const edenClient = treaty<App>('http://localhost:3000')
```

### 3. Set up providers

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EdenProvider, edenClient } from './lib/eden'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EdenProvider client={edenClient} queryClient={queryClient}>
        <YourApp />
      </EdenProvider>
    </QueryClientProvider>
  )
}
```

### 4. Use in components

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEden } from './lib/eden'

function UserList() {
  const eden = useEden()
  const queryClient = useQueryClient()

  // Query
  const { data: users } = useQuery(eden.users.get.queryOptions())

  // Query with path params
  const { data: user } = useQuery(
    eden.users({ id: '1' }).get.queryOptions()
  )

  // Mutation with cache invalidation
  const createUser = useMutation({
    ...eden.users.post.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eden.users.get.queryKey() })
    }
  })

  return (
    <div>
      <ul>
        {users?.map(user => <li key={user.id}>{user.name}</li>)}
      </ul>
      <button onClick={() => createUser.mutate({ name: 'New User' })}>
        Add User
      </button>
    </div>
  )
}
```

## 📖 API Reference

### createEdenTanStackQuery<App>()

Creates typed providers and hooks for your Elysia app.

```typescript
const { EdenProvider, useEden, useEdenClient } = createEdenTanStackQuery<App>()
```

### useEden()

Returns the Eden options proxy with methods for each route.

#### Query Methods (GET, HEAD, OPTIONS)

| Method | Description |
|--------|-------------|
| `.queryOptions(input?, opts?)` | Options for `useQuery` |
| `.queryKey(input?)` | Query key for cache operations |
| `.infiniteQueryOptions(input, opts)` | Options for `useInfiniteQuery` |

#### Mutation Methods (POST, PUT, PATCH, DELETE)

| Method | Description |
|--------|-------------|
| `.mutationOptions(opts?)` | Options for `useMutation` |
| `.mutationKey()` | Mutation key |

### Path Parameters

Access routes with path params using function calls:

```typescript
// Route: /users/:id
eden.users({ id: '123' }).get.queryOptions()

// Nested: /posts/:postId/comments/:commentId
eden.posts({ postId: '1' }).comments({ commentId: '2' }).get.queryOptions()
```

### Infinite Queries

For paginated data:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
  eden.posts.get.infiniteQueryOptions(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: null,
    }
  )
)
```

### Query with Input

Pass query parameters or request body:

```typescript
// Query params: GET /users?role=admin
eden.users.get.queryOptions({ query: { role: 'admin' } })

// With headers
eden.users.get.queryOptions({
  query: { role: 'admin' },
  headers: { 'X-Custom': 'value' }
})
```

## 🔄 Comparison

| Feature | eden-tanstack-react-query | eden-query |
|---------|---------------------------|------------|
| API Style | `useQuery(eden.users.get.queryOptions())` | `eden.users.get.useQuery()` |
| TanStack Query Native | ✅ Standard hooks | ❌ Custom wrappers |
| Query Options | ✅ Full access | ❌ Limited |
| Learning Curve | Standard TanStack Query | Custom API |
| Bundle Size | ~10 KB | Larger |

## 📄 License

[Apache-2.0](../../LICENSE)

Copyright 2025 Ilya Zhidkov
