import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "./generated/prisma/client"

// libSQL rather than better-sqlite3, whose V8 C++ addon Bun cannot load.
// Anchored to this file so the database stays the same one prisma.config.ts
// points at, no matter which directory the server is started from.
const databaseUrl = new URL("../../prisma/dev.db", import.meta.url).href

const prismaClientSingleton = () => {
	const adapter = new PrismaLibSql({ url: databaseUrl })
	return new PrismaClient({ adapter })
}

type GlobalForPrisma = typeof globalThis & {
	prisma: ReturnType<typeof prismaClientSingleton>
}

const globalForPrisma = globalThis as GlobalForPrisma

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export const db: typeof prisma = prisma
