import { Prisma } from "@/generated/prisma/client";
import type { Tx } from "./tenancy/scoped";

/**
 * The next number of a named series in the organisation (Employee IDs, references). Safe under concurrency: one
 * UPSERT … RETURNING in the caller's transaction, so two people never get the same number. Runs inside the tenant
 * transaction, so RLS and the default tenantId apply.
 */
export async function nextNumber(tx: Tx, name: string, start = 1): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>(Prisma.sql`
    INSERT INTO "Sequence" (id, "tenantId", name, value)
    VALUES (gen_random_uuid()::text, current_setting('app.tenant_id'), ${name}, ${start})
    ON CONFLICT ("tenantId", name) DO UPDATE SET value = "Sequence".value + 1
    RETURNING value`);
  return Number(rows[0].value);
}

/** "DCB/REC/2026/007". */
export function formatRef(parts: (string | number)[], n: number, width = 3) {
  return [...parts, String(n).padStart(width, "0")].join("/");
}
