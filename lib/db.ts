import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { requireEnv } from "./env";

// Prisma 7 connects through a driver adapter. PrismaPg uses node-postgres (`pg`)
// and works with any standard Postgres (Neon, Supabase, RDS, local, …).
function createClient() {
  const connectionString = requireEnv("DATABASE_URL");
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
