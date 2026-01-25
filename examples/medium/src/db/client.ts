import { PrismaClient } from "./generated/prisma/client"

const prismaClientSingleton = () => {
	return new PrismaClient()
}

type GlobalForPrisma = typeof globalThis & {
	prisma: ReturnType<typeof prismaClientSingleton>
}

const globalForPrisma = globalThis as GlobalForPrisma

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export const db: typeof prisma = prisma
