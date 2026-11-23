import "server-only";
/**
 * The platform console's view of organisations: lists, counts, status, modules, limits, and the one rescue it may
 * perform inside an organisation (a new password for an Admin). It never reads an organisation's people or pay:
 * counts come from acrossTenants() as plain numbers.
 */
import { z } from "zod";
import type { TenantStatus } from "@/generated/prisma/enums";
import { audit } from "@/core/audit";
import { endSessionsOf } from "@/core/auth/session";
import type { PlatformActor } from "@/core/auth/platform-session";
import { temporaryPassword } from "@/core/crypto";
import { badRequest, forbidden, notFound } from "@/core/errors";
import { hashPassword } from "@/core/password";
import { MODULES, normaliseModules } from "@/core/tenancy/modules";
import { acrossTenants } from "@/core/tenancy/platform";
import { rawDb } from "@/core/tenancy/raw";
import { tenantDb } from "@/core/tenancy/scoped";
import { platformAudit } from "./audit";

const by = (pa: PlatformActor) => ({ userId: pa.userId, name: pa.name, ip: pa.ip });

function requireOwner(pa: PlatformActor) {
  if (pa.role !== "OWNER") throw forbidden();
}

/** Users and (when the module exists) employees per organisation, in one cross-tenant read. */
async function countsByTenant(): Promise<Map<string, { users: number; employees: number }>> {
  return acrossTenants(async (tx) => {
    const users = await tx.user.groupBy({ by: ["tenantId"], where: { status: "ACTIVE" }, _count: { _all: true } });
    // The Employee table arrives with the employee module; a failed query would abort the transaction, so ask first.
    const [{ exists }] = await tx.$queryRawUnsafe<{ exists: boolean }[]>(`SELECT to_regclass('public."Employee"') IS NOT NULL AS exists`);
    const employees = exists
      ? await tx.$queryRawUnsafe<{ tenantId: string; n: bigint }[]>(`SELECT "tenantId", count(*) AS n FROM "Employee" WHERE status IN ('ACTIVE','SUSPENDED') GROUP BY "tenantId"`)
      : [];
    const out = new Map<string, { users: number; employees: number }>();
    for (const u of users) out.set(u.tenantId, { users: u._count._all, employees: 0 });
    for (const e of employees) out.set(e.tenantId, { users: out.get(e.tenantId)?.users ?? 0, employees: Number(e.n) });
    return out;
  });
}

export async function listTenants(filter: { q?: string; status?: TenantStatus } = {}) {
  const q = filter.q?.trim();
  const [tenants, counts] = await Promise.all([
    rawDb().tenant.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q.toUpperCase() } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    countsByTenant(),
  ]);
  return tenants.map((t) => ({ ...t, users: counts.get(t.id)?.users ?? 0, employees: counts.get(t.id)?.employees ?? 0 }));
}

export async function platformDashboard() {
  const since = new Date(Date.now() - 86_400_000);
  const [byStatus, counts, signedIn, recent, activity] = await Promise.all([
    rawDb().tenant.groupBy({ by: ["status"], _count: { _all: true } }),
    countsByTenant(),
    rawDb().session.findMany({ where: { verifiedAt: { not: null }, lastSeenAt: { gt: since } }, distinct: ["userId"], select: { userId: true } }),
    rawDb().tenant.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    rawDb().platformAudit.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<Record<TenantStatus, number>>;
  let users = 0;
  let employees = 0;
  for (const c of counts.values()) {
    users += c.users;
    employees += c.employees;
  }
  return {
    total: byStatus.reduce((a, s) => a + s._count._all, 0),
    status,
    users,
    employees,
    signedInToday: signedIn.length,
    recent: recent.map((t) => ({ ...t, users: counts.get(t.id)?.users ?? 0, employees: counts.get(t.id)?.employees ?? 0 })),
    activity,
  };
}

export async function getTenant(id: string) {
  const t = await rawDb().tenant.findUnique({ where: { id } });
  if (!t) throw notFound();
  const db = tenantDb(id);
  const [counts, admins, lastAudit, activity] = await Promise.all([
    countsByTenant(),
    db.user.findMany({ where: { loginType: "ADMIN", permissions: { has: "APPROVER" } }, select: { id: true, loginId: true, name: true, status: true, lastLoginAt: true, lockedUntil: true }, orderBy: { createdAt: "asc" } }),
    db.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    rawDb().platformAudit.findMany({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return { tenant: t, users: counts.get(id)?.users ?? 0, employees: counts.get(id)?.employees ?? 0, admins, lastActivity: lastAudit?.createdAt ?? null, activity };
}

export const statusSchema = z.object({ status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CLOSED"]), reason: z.string().trim().max(300).optional() });

/** Pausing or closing signs everyone of the organisation out at once; their data stays untouched. */
export async function setTenantStatus(pa: PlatformActor, id: string, input: z.infer<typeof statusSchema>) {
  requireOwner(pa);
  const t = await rawDb().tenant.findUnique({ where: { id } });
  if (!t) throw notFound();
  if ((input.status === "SUSPENDED" || input.status === "CLOSED") && !input.reason) throw badRequest("errors.validation", { reason: "validation.required" });
  await rawDb().tenant.update({ where: { id }, data: { status: input.status, suspendedReason: input.status === "SUSPENDED" || input.status === "CLOSED" ? input.reason : null } });
  if (input.status === "SUSPENDED" || input.status === "CLOSED") await endSessionsOf({ tenantId: id });
  await platformAudit(by(pa), { action: "TENANT_STATUS", tenantId: id, summary: `${t.code}: ${t.status} → ${input.status}`, data: { reason: input.reason ?? null } });
}

export const modulesSchema = z.object({ modules: z.array(z.enum(MODULES)) });

export async function setTenantModules(pa: PlatformActor, id: string, input: z.infer<typeof modulesSchema>) {
  requireOwner(pa);
  const t = await rawDb().tenant.findUnique({ where: { id } });
  if (!t) throw notFound();
  const modules = normaliseModules(input.modules);
  await rawDb().tenant.update({ where: { id }, data: { modules } });
  await platformAudit(by(pa), { action: "TENANT_MODULES", tenantId: id, summary: `${t.code}: modules changed`, data: { before: t.modules, after: modules } });
  return modules;
}

export const limitsSchema = z.object({ maxUsers: z.number().int().min(1).max(100_000), maxEmployees: z.number().int().min(1).max(1_000_000), plan: z.string().trim().min(1).max(30) });

export async function setTenantLimits(pa: PlatformActor, id: string, input: z.infer<typeof limitsSchema>) {
  requireOwner(pa);
  const t = await rawDb().tenant.findUnique({ where: { id } });
  if (!t) throw notFound();
  await rawDb().tenant.update({ where: { id }, data: input });
  await platformAudit(by(pa), { action: "TENANT_LIMITS", tenantId: id, summary: `${t.code}: limits changed`, data: { before: { maxUsers: t.maxUsers, maxEmployees: t.maxEmployees, plan: t.plan }, after: input } });
}

/**
 * The console's one action inside an organisation: a new one-time password for one of its Admins (for when the
 * last Admin is locked out). Recorded in both audit trails; the Admin must change it at first sign-in.
 */
export async function resetTenantAdmin(pa: PlatformActor, id: string, userId: string) {
  requireOwner(pa);
  const db = tenantDb(id);
  const admin = await db.user.findFirst({ where: { id: userId, loginType: "ADMIN" } });
  if (!admin) throw notFound();
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: admin.id }, data: { passwordHash, mustChangePassword: true, failedLogins: 0, lockedUntil: null, status: "ACTIVE" } });
    await audit(tx, { name: `Platform · ${pa.name}`, ip: pa.ip }, { action: "PASSWORD_RESET", entityType: "User", entityId: admin.id, summary: `Platform gave ${admin.loginId} a new one-time password`, category: "SYSTEM" });
  });
  await endSessionsOf({ tenantId: id, userId: admin.id });
  await platformAudit(by(pa), { action: "TENANT_ADMIN_RESET", tenantId: id, summary: `New one-time password for ${admin.loginId}` });
  return { loginId: admin.loginId, password };
}

export async function listPlatformAudit(take = 100) {
  return rawDb().platformAudit.findMany({ orderBy: { createdAt: "desc" }, take });
}
