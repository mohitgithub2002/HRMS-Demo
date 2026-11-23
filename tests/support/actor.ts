/** A signed-in person for service tests, without a browser session. */
import type { Prisma } from "@/generated/prisma/client";
import type { LoginType, Permission } from "@/generated/prisma/enums";
import type { Actor } from "@/core/auth/session";
import { rawDb } from "@/core/tenancy/raw";
import { tenantDb } from "@/core/tenancy/scoped";

export async function makeActor(tenantId: string, opts: { loginId: string; loginType: LoginType; permissions: Permission[]; simple?: boolean; employeeId?: string | null; sectionId?: string | null }): Promise<Actor> {
  const db = tenantDb(tenantId);
  const t = await rawDb().tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const user = await db.user.create({ data: { loginId: opts.loginId, name: opts.loginId, loginType: opts.loginType, permissions: opts.permissions, employeeId: opts.employeeId ?? null, mustChangePassword: false } as Prisma.UserUncheckedCreateInput });
  return {
    tenantId,
    tenant: { id: t.id, code: t.code, name: t.name, nameHi: t.nameHi, shortName: t.shortName, status: t.status, modules: t.modules, accentColor: null, setupDone: false },
    db,
    userId: user.id,
    sessionId: `test-${user.id}`,
    loginId: user.loginId,
    name: user.name,
    loginType: opts.loginType,
    permissions: opts.permissions,
    modules: t.modules,
    simple: opts.simple ?? false,
    employeeId: opts.employeeId ?? null,
    pensionerId: null,
    sectionId: opts.sectionId ?? null,
    isEmployee: Boolean(opts.employeeId),
    isPensioner: false,
    language: "en",
    mustChangePassword: false,
    ip: null,
    userAgent: null,
  };
}
