# eden-tanstack-query

[![npm version](https://img.shields.io/npm/v/eden-tanstack-react-query)](https://www.npmjs.com/package/eden-tanstack-react-query)
[![npm downloads](https://img.shields.io/npm/dm/eden-tanstack-react-query)](https://www.npmjs.com/package/eden-tanstack-react-query)
[![codecov](https://codecov.io/gh/xkelxmc/eden-tanstack-query/branch/main/graph/badge.svg)](https://codecov.io/gh/xkelxmc/eden-tanstack-query)
[![Tests](https://github.com/xkelxmc/eden-tanstack-query/actions/workflows/test.yml/badge.svg)](https://github.com/xkelxmc/eden-tanstack-query/actions/workflows/test.yml)

[![GitHub last commit](https://img.shields.io/github/last-commit/xkelxmc/eden-tanstack-query)](https://github.com/xkelxmc/eden-tanstack-query/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/xkelxmc/eden-tanstack-query)](https://github.com/xkelxmc/eden-tanstack-query/stargazers)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Type-safe TanStack Query integration for Elysia Eden. Like @trpc/react-query, but for Elysia.

## Packages

| Package | Version | Size |
|---------|---------|------|
| [eden-tanstack-react-query](./packages/eden-tanstack-query) | 0.1.0 | **Size:** 10.82 KB (gzipped: 2.55 KB) |

## Quick Start

```bash
bun add eden-tanstack-react-query @tanstack/react-query @elysiajs/eden
```

```typescript
import { createEdenTanStackQuery } from 'eden-tanstack-react-query'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { App } from './server'

const { EdenProvider, useEden } = createEdenTanStackQuery<App>()

function UserList() {
  const eden = useEden()

  // Fully typed queries
  const { data: users } = useQuery(eden.users.get.queryOptions())

  // Fully typed mutations
  const createUser = useMutation(eden.users.post.mutationOptions())

  return (/* ... */)
}
```

See [full documentation](./packages/eden-tanstack-query/README.md) for details.

See [CHANGELOG](./packages/eden-tanstack-query/CHANGELOG.md) for release history.

## Examples

| Example | Description |
|---------|-------------|
| [basic](./examples/basic) | Simple CRUD with users |
| [medium](./examples/medium) | Blog with posts, comments, users |
| [large](./examples/large) | Full app with organizations, members, posts, comments, categories, tags |

```bash
# Run an example
cd examples/basic
bun install
bun run dev
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Type check
bun run test:types
```

## License

[Apache-2.0](./LICENSE)

Copyright 2025 Ilya Zhidkov
