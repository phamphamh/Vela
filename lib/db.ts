import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Prisma 7 connects through a driver adapter. PrismaPg uses node-postgres (`pg`)
// and works with any standard Postgres (Neon, Supabase, RDS, local, …).
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// database connections. In production a fresh instance per server is fine.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
