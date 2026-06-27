import { PrismaClient } from "@prisma/client";

// Lazy singleton — avoids exhausting connections in dev/hot-reload and at build time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
