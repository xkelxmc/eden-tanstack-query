# eden-tanstack-query

[![npm version](https://img.shields.io/npm/v/eden-tanstack-react-query)](https://www.npmjs.com/package/eden-tanstack-react-query)
[![npm downloads](https://img.shields.io/npm/dm/eden-tanstack-react-query)](https://www.npmjs.com/package/eden-tanstack-react-query)
[![codecov](https://codecov.io/gh/xkelxmc/eden-tanstack-query/branch/main/graph/badge.svg)](https://codecov.io/gh/xkelxmc/eden-tanstack-query)
[![Tests](https://github.com/xkelxmc/eden-tanstack-query/actions/workflows/test.yml/badge.svg)](https://github.com/xkelxmc/eden-tanstack-query/actions/workflows/test.yml)

[![GitHub last commit](https://img.shields.io/github/last-commit/xkelxmc/eden-tanstack-query)](https://github.com/xkelxmc/eden-tanstack-query/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/xkelxmc/eden-tanstack-query)](https://github.com/xkelxmc/eden-tanstack-query/stargazers)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg)](https://www.typescriptlang.org/)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/xkelxmc/eden-tanstack-query?utm_source=oss&utm_medium=github&utm_campaign=xkelxmc%2Feden-tanstack-query&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

Type-safe TanStack Query integration for Elysia Eden. Like @trpc/react-query, but for Elysia.

## Packages

| Package | Version | Size |
|---------|---------|------|
| [eden-tanstack-react-query](./packages/eden-tanstack-query) | 0.2.0 | **Size:** 15.90 KB (gzipped: 3.81 KB) |

## Usage Preview

This shows the component API. See the [Getting Started guide](https://eden-query.xkel.me/docs/getting-started) for the complete client and provider setup.

```bash
bun add eden-tanstack-react-query @tanstack/react-query @elysiajs/eden elysia
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

**[Documentation](https://eden-query.xkel.me)** · [Package README](./packages/eden-tanstack-query/README.md) · [CHANGELOG](./packages/eden-tanstack-query/CHANGELOG.md)

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
bun run typecheck
```

## License

[Apache-2.0](./LICENSE)

Copyright 2025-2026 Ilya Zhidkov
