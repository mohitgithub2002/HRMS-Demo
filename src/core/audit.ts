/**
 * The audit trail (PRD §11, §16). Write it inside the same transaction as the change, so a record and its audit
 * entry are saved together or not at all. Rows land in the acting organisation's trail (tenantId comes from the
 * transaction). Never store raw Aadhaar, PAN or bank numbers in old/new values — pass the masked form.
 */
import type { AuditCategory, LoginType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { DbLike } from "./tenancy/scoped";

/** Who did it. A signed-in actor fits; so does a bare description for sign-in attempts and system jobs. */
export interface AuditWho {
  userId?: string | null;
  name?: string | null;
  loginType?: LoginType | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  oldValue?: unknown;
  newValue?: unknown;
  /** SYSTEM = logins, users, permissions, settings. Everything else is DATA. */
  category?: AuditCategory;
  /** True when old/new values touch pay, bank or Aadhaar (hidden from the User & settings manager). */
  sensitive?: boolean;
}

export function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export async function audit(tx: DbLike, who: AuditWho, entry: AuditEntry) {
  await tx.auditLog.create({
    data: {
      userId: who.userId ?? null,
      userName: who.name ?? null,
      loginType: who.loginType ?? null,
      ip: who.ip ?? null,
      userAgent: who.userAgent ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      category: entry.category ?? "DATA",
      isSensitive: entry.sensitive ?? false,
      oldValue: toJson(entry.oldValue),
      newValue: toJson(entry.newValue),
    } as Prisma.AuditLogUncheckedCreateInput,
  });
}

/** Old → new for only the fields that changed. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : (v ?? null));
    if (JSON.stringify(norm(before[key])) !== JSON.stringify(norm(after[key]))) {
      oldValue[key] = norm(before[key]);
      newValue[key] = norm(after[key]);
    }
  }
  return { oldValue, newValue, changed: Object.keys(newValue) };
}
