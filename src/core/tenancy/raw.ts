/**
 * The one database connection pool of the process, and the raw client over it.
 *
 * Only src/core/tenancy and the platform's own tables may use the raw client (an ESLint rule keeps modules away
 * from this file). Business code always goes through tenantDb(), which runs every query as one organisation.
 * Not "server-only": the seed and scripts use it too.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { KoshPool } from "./pool";

const g = globalThis as unknown as { koshPrisma?: PrismaClient };

const num = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/**
 * How long a query may wait for a connection, and how long a transaction may run. A serverless database (Neon,
 * Supabase) can take a few seconds to wake from idle, and a busy page fires many short transactions at once, so the
 * waits are generous; each can be tuned with an environment variable.
 */
export const DB_TX_MAX_WAIT_MS = num("DB_TX_MAX_WAIT_MS", 20_000);
export const DB_TX_TIMEOUT_MS = num("DB_TX_TIMEOUT_MS", 30_000);

export function rawDb(): PrismaClient {
  if (!g.koshPrisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // KoshPool sends three round trips per read instead of four, one with DB_PIPELINE=1 (pool.ts).
    const pool = new KoshPool({
      connectionString: url,
      pipeline: process.env.DB_PIPELINE === "1",
      // Notice a connection that died while the server was asleep (a serverless instance frozen between requests)
      // instead of waiting on it.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      max: num("DB_POOL_MAX", 10),
      // Wait for a waking database instead of failing at once; let idle connections go so it can sleep again.
      connectionTimeoutMillis: num("DB_CONNECT_TIMEOUT_MS", 20_000),
      idleTimeoutMillis: num("DB_IDLE_TIMEOUT_MS", 30_000),
    });
    const adapter = new PrismaPg(pool, { disposeExternalPool: true });
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
