/**
 * The walls between organisations (docs/ARCHITECTURE.md §Isolation). Two organisations, the same codes in both,
 * and every way of reaching the other's rows is tried: reads, finds by id, updates, deletes, upserts, counts,
 * transactions, raw SQL, and RLS alone without the client's own filter.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { tenantDb } from "@/core/tenancy/scoped";
import { acrossTenants } from "@/core/tenancy/platform";
import { rawDb } from "@/core/tenancy/raw";
import { hasDb, makeTenant, wipe } from "../support/db";

describe.skipIf(!hasDb)("tenant isolation", () => {
  let a: string;
  let b: string;
  let secretId: string;

  beforeAll(async () => {
    await wipe();
    a = (await makeTenant("A")).id;
    b = (await makeTenant("B")).id;
    await tenantDb(a).section.create({ data: { code: "HQ", name: "A head office" } });
    const s = await tenantDb(b).section.create({ data: { code: "HQ", name: "B head office" } });
    secretId = s.id;
  });
  afterAll(wipe);

  it("fills tenantId on create and keeps the same code apart per organisation", async () => {
    const rows = await acrossTenants((tx) => tx.section.findMany({ orderBy: { name: "asc" } }));
    expect(rows.map((r) => [r.tenantId, r.name])).toEqual([
      [a, "A head office"],
      [b, "B head office"],
    ]);
  });

  it("reads only its own rows", async () => {
    expect((await tenantDb(a).section.findMany()).map((s) => s.name)).toEqual(["A head office"]);
    expect(await tenantDb(a).section.count()).toBe(1);
    expect(await tenantDb(a).section.findUnique({ where: { id: secretId } })).toBeNull();
    expect(await tenantDb(a).section.findFirst({ where: { name: "B head office" } })).toBeNull();
  });

  it("cannot update, delete or upsert another organisation's row", async () => {
    await expect(tenantDb(a).section.update({ where: { id: secretId }, data: { name: "x" } })).rejects.toThrow();
    expect((await tenantDb(a).section.updateMany({ data: { name: "renamed" }, where: { code: "HQ" } })).count).toBe(1);
    await expect(tenantDb(a).section.delete({ where: { id: secretId } })).rejects.toThrow();
    expect((await tenantDb(a).section.deleteMany({ where: { id: secretId } })).count).toBe(0);
    const u = await tenantDb(a).section.upsert({ where: { id: secretId }, create: { code: "NEW", name: "made in A" }, update: { name: "stolen" } });
    expect(u.tenantId).toBe(a);
    const theirs = await tenantDb(b).section.findUnique({ where: { id: secretId } });
    expect(theirs?.name).toBe("B head office");
  });

  it("cannot move a row to another organisation or write one for it", async () => {
    const mine = await tenantDb(a).section.create({ data: { code: "MOVE", name: "mine", tenantId: b } as never });
    expect(mine.tenantId).toBe(a);
    await tenantDb(a).section.update({ where: { id: mine.id }, data: { tenantId: b } as never });
    expect((await tenantDb(a).section.findUnique({ where: { id: mine.id } }))?.tenantId).toBe(a);
  });

  it("keeps the wall inside transactions and raw SQL", async () => {
    const names = await tenantDb(a).$transaction(async (tx) => {
      const viaModel = await tx.section.findMany({ select: { name: true } });
      const viaSql = await tx.$queryRaw<{ name: string }[]>(Prisma.sql`SELECT name FROM "Section"`);
      return { viaModel: viaModel.length, viaSql: viaSql.map((r) => r.name) };
    });
    expect(names.viaModel).toBe(names.viaSql.length);
    expect(names.viaSql).not.toContain("B head office");
    expect(() => (tenantDb(a) as unknown as { $queryRaw: () => void }).$queryRaw()).toThrow(/inside db.\$transaction/);
  });

  it("RLS alone hides other organisations, even with no filter in the query", async () => {
    // Straight to the pool, as a forgetful module would: set the tenant, select everything.
    const rows = await rawDb().$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${a}, true)`);
      return tx.$queryRaw<{ tenantId: string }[]>(Prisma.sql`SELECT "tenantId" FROM "Section"`);
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenantId === a)).toBe(true);
    // And with no tenant at all, nothing.
    expect(await rawDb().section.count()).toBe(0);
  });

  it("keeps the wall under load: many reads of two organisations at once on few connections (core/tenancy/pool.ts)", async () => {
    // The pool sends BEGIN with the setting (and, with DB_PIPELINE=1, pipelines the query and does not wait for a read's
    // COMMIT); with connections passed quickly from one organisation to the other, every read must still see only its
    // own rows. Run it with DB_PIPELINE=1 too.
    const rounds = Array.from({ length: 300 }, (_, i) => (i % 2 ? b : a));
    const seen = await Promise.all(
      rounds.map(async (id, i) => {
        const db = tenantDb(id);
        if (i % 3 === 0) {
          // RLS alone, inside an interactive transaction: what the setting says, and the rows it lets through.
          return db.$transaction(async (tx) => {
            const [{ t }] = await tx.$queryRaw<{ t: string }[]>(Prisma.sql`SELECT current_setting('app.tenant_id') AS t`);
            const rows = await tx.$queryRaw<{ tenantId: string }[]>(Prisma.sql`SELECT "tenantId" FROM "Section"`);
            return { id, tenants: [t, ...rows.map((r) => r.tenantId)] };
          });
        }
        const rows = await db.section.findMany({ select: { tenantId: true, name: true } });
        return { id, tenants: rows.map((r) => r.tenantId) };
      }),
    );
    for (const s of seen) {
      expect(s.tenants.length).toBeGreaterThan(0);
      expect(new Set(s.tenants)).toEqual(new Set([s.id]));
    }
  });

  it("refuses the platform tables through a tenant client", async () => {
    await expect(tenantDb(a).tenant.findMany()).rejects.toThrow(/platform table/);
  });

  it("every table with tenantId has forced row-level security", async () => {
    const rows = await rawDb().$queryRaw<{ table: string; rls: boolean; forced: boolean }[]>(Prisma.sql`
      SELECT c.relname AS table, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN information_schema.columns col ON col.table_name = c.relname AND col.table_schema = n.nspname
      WHERE n.nspname = 'public' AND col.column_name = 'tenantId' AND c.relkind = 'r'
        AND c.relname NOT IN ('Session', 'OtpChallenge', 'PlatformAudit', 'DeviceRegistration')`);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.filter((r) => !r.rls || !r.forced).map((r) => r.table)).toEqual([]);
  });

  it("every reference between two organisation tables has its same-organisation partner key", async () => {
    const missing = await rawDb().$queryRaw<{ conname: string }[]>(Prisma.sql`
      SELECT c.conname FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.conrelid)
      WHERE c.contype = 'f' AND n.nspname = 'public' AND array_length(c.conkey, 1) = 1 AND c.conname NOT LIKE 'kosh_tfk_%'
        AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.conrelid AND x.attname = 'tenantId')
        AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.confrelid AND x.attname = 'tenantId')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conname = left('kosh_tfk_' || c.conname, 63))`);
    expect(missing.map((m) => m.conname)).toEqual([]);
  });
});
