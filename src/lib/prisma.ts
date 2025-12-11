import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma_ph25: PrismaClient };

console.log("Initializing Prisma Client Factory...");

export const prisma = globalForPrisma.prisma_ph25 || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_ph25 = prisma;
