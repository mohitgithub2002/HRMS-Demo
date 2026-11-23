import { rawDb } from "@/core/tenancy/raw";
import { acrossTenants } from "@/core/tenancy/platform";

export const hasDb = Boolean(process.env.TEST_DATABASE_URL);

/** Creates a bare organisation row for a test. */
export async function makeTenant(code: string) {
  return rawDb().tenant.create({ data: { code: `${code}${Math.random().toString(36).slice(2, 6).toUpperCase()}`, name: `Org ${code}`, modules: [] } });
}

/** Empties every table (between test files). TRUNCATE is not row-level and fires no delete triggers. */
export async function wipe() {
  await acrossTenants(async (tx) => {
    const rows = await tx.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (rows.length) await tx.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
  });
}
