/**
 * The one database connection pool of the process, and the raw client over it.
 *
 * Only src/core/tenancy and the platform's own tables may use the raw client (an ESLint rule keeps modules away
 * from this file). Business code always goes through tenantDb(), which runs every query as one organisation.
 * Not "server-only": the seed and scripts use it too.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const g = globalThis as unknown as { koshPrisma?: PrismaClient };

export function rawDb(): PrismaClient {
  if (!g.koshPrisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const adapter = new PrismaPg({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 10) });
    const log = process.env.PERF_LOG_QUERIES ? [{ emit: "event" as const, level: "query" as const }] : [];
    g.koshPrisma = new PrismaClient({ adapter, log });
    if (log.length) {
      const c = g.koshPrisma as unknown as { $on: (e: "query", f: (q: { query: string; duration: number }) => void) => void };
      c.$on("query", (q) => console.log(`[q] ${q.duration}ms ${q.query.replace(/\s+/g, " ").slice(0, 200)}`));
    }
  }
  return g.koshPrisma;
}

/** Tests and scripts: close the pool so the process can exit. */
export async function disconnectRaw() {
  if (g.koshPrisma) {
    await g.koshPrisma.$disconnect();
    g.koshPrisma = undefined;
  }
}
