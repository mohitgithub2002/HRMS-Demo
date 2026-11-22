/** The platform team's own trail (append-only, like the organisations' audit trail). */
import type { Prisma } from "@/generated/prisma/client";
import { rawDb } from "@/core/tenancy/raw";

export async function platformAudit(by: { userId: string | null; name: string; ip?: string | null }, entry: { action: string; tenantId?: string | null; summary: string; data?: unknown }) {
  await rawDb().platformAudit.create({
    data: {
      userId: by.userId,
      userName: by.name,
      ip: by.ip ?? null,
      action: entry.action,
      tenantId: entry.tenantId ?? null,
      summary: entry.summary,
      data: entry.data === undefined ? undefined : (JSON.parse(JSON.stringify(entry.data)) as Prisma.InputJsonValue),
    },
  });
}
