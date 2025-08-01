import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const { POSTGRES_URL: connectionString } = process.env
const adapter = new PrismaPg({ connectionString })

const globalForPrisma = global as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
