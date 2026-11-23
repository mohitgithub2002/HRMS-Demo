/**
 * The platform's own access to the database.
 *
 * platformDb() is the raw client, for the platform tables (Tenant, PlatformUser, sessions). Tenant tables read
 * through it see nothing — RLS has no tenant set.
 *
 * acrossTenants(fn) is the one deliberate door through RLS: a transaction with app.platform = 'on', used by the
 * console for counts and by provisioning. Only src/platform and src/core may call it (ESLint rule); every use is
 * meant to be visible in review.
 */
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { rawDb } from "./raw";
import type { Tx } from "./scoped";

export function platformDb(): PrismaClient {
  return rawDb();
}

export async function acrossTenants<T>(fn: (tx: Tx) => Promise<T>, options?: { timeout?: number }): Promise<T> {
  return rawDb().$transaction(
    async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.platform', 'on', true)`);
      return fn(tx);
    },
    { timeout: options?.timeout ?? 20_000, maxWait: 10_000 },
  );
}

let checked: Promise<void> | null = null;

/**
 * Row-level security is one of the walls between organisations, and PostgreSQL skips it for superusers and roles
 * with BYPASSRLS. Production refuses to run on such a login; other copies only warn (the scoped client still holds).
 */
export function assertRlsEnforced(): Promise<void> {
  if (!checked) {
    checked = (async () => {
      const rows = await rawDb().$queryRaw<{ rolsuper: boolean; rolbypassrls: boolean }[]>(
        Prisma.sql`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
      );
      const r = rows[0];
      if (r && (r.rolsuper || r.rolbypassrls)) {
        const message = "The database login bypasses row-level security (superuser or BYPASSRLS). Use an ordinary login.";
        if (process.env.APP_ENV === "production") throw new Error(message);
        console.warn(`[kosh] ${message}`);
      }
    })().catch((e) => {
      checked = null;
      throw e;
    });
  }
  return checked;
}
