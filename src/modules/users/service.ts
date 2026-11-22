import "server-only";
/**
 * Users & roles (S-80). The User & settings manager (or the Admin in the simple way) creates logins, gives each a
 * role — a ready-made set of permissions — or ticks permissions one by one, resets passwords and switches logins
 * off. The organisation's user limit (set by the platform) is enforced here.
 */
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { canManageUsers, permissionConflicts, PERMISSIONS_BY_LOGIN } from "@/core/auth/access";
import { ROLE_DEFS, SIMPLE_ROLES } from "@/core/auth/roles";
import { endSessionsOf, type Actor } from "@/core/auth/session";
import { audit } from "@/core/audit";
import { temporaryPassword } from "@/core/crypto";
import { AppError, badRequest, conflict, forbidden, notFound } from "@/core/errors";
import { hashPassword } from "@/core/password";
import { tenantLimits } from "@/core/tenancy/limits";

const PERMS = ["APPROVER", "PAY_BILL_SIGNER", "USER_SETTINGS_MANAGER", "HR", "PAYROLL", "PENSION", "CHECKER", "REPORTING_OFFICER"] as const;

export const userSchema = z.object({
  loginId: z.string().trim().toUpperCase().regex(/^[A-Z0-9._-]{3,30}$/, "validation.code"),
  name: z.string().trim().min(2).max(80),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, "validation.mobile").optional().or(z.literal("")).transform((v) => v || null),
  email: z.string().trim().email("validation.email").optional().or(z.literal("")).transform((v) => v || null),
  role: z.enum(SIMPLE_ROLES as [string, ...string[]]).optional(),
  loginType: z.enum(["ADMIN", "HR_ACCOUNTS", "EMPLOYEE"]).optional(),
  permissions: z.array(z.enum(PERMS)).optional(),
});

export const updateUserSchema = userSchema.omit({ loginId: true }).partial().extend({ status: z.enum(["ACTIVE", "DISABLED"]).optional() });

function require(actor: Actor) {
  if (!canManageUsers(actor)) throw forbidden();
}

/** A role, or a login type with ticked permissions, turned into what is stored. */
function resolveAccess(input: { role?: string; loginType?: "ADMIN" | "HR_ACCOUNTS" | "EMPLOYEE"; permissions?: readonly string[] }, simple: boolean) {
  if (input.role) return ROLE_DEFS[input.role as keyof typeof ROLE_DEFS];
  if (!input.loginType) throw badRequest("errors.validation", { role: "validation.required" });
  const allowed = new Set<string>(PERMISSIONS_BY_LOGIN[input.loginType]);
  const permissions = (input.permissions ?? []).filter((p) => allowed.has(p)) as (typeof PERMS)[number][];
  if (permissionConflicts(permissions, simple)) throw badRequest("errors.validation", { permissions: "users.conflict" });
  return { loginType: input.loginType, permissions };
}

export async function listUsers(actor: Actor) {
  require(actor);
  return actor.db.user.findMany({
    orderBy: [{ status: "asc" }, { loginType: "asc" }, { name: "asc" }],
    select: { id: true, loginId: true, name: true, mobile: true, email: true, loginType: true, permissions: true, status: true, lastLoginAt: true, lockedUntil: true },
  });
}

export async function createUser(actor: Actor, input: z.infer<typeof userSchema>) {
  require(actor);
  const access = resolveAccess(input, Boolean(actor.simple));
  const limits = await tenantLimits(actor.tenantId);
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  const user = await actor.db.$transaction(async (tx) => {
    const active = await tx.user.count({ where: { status: "ACTIVE" } });
    if (active >= limits.maxUsers) throw new AppError(409, "limit", "errors.limitReached", { limit: limits.maxUsers, what: "users" });
    if (await tx.user.findFirst({ where: { loginId: input.loginId } })) throw conflict("errors.duplicateCode", undefined, { loginId: "errors.duplicateCode" });
    const u = await tx.user.create({
      data: { loginId: input.loginId, name: input.name, mobile: input.mobile, email: input.email, loginType: access.loginType, permissions: access.permissions, passwordHash, mustChangePassword: true } as Prisma.UserUncheckedCreateInput,
    });
    await audit(tx, actor, { action: "CREATE", entityType: "User", entityId: u.id, summary: `Login created: ${u.loginId} (${u.name})`, category: "SYSTEM", newValue: { loginType: u.loginType, permissions: u.permissions } });
    return u;
  });
  return { id: user.id, password };
}

export async function updateUser(actor: Actor, id: string, input: z.infer<typeof updateUserSchema>) {
  require(actor);
  const before = await actor.db.user.findUnique({ where: { id } });
  if (!before) throw notFound();
  if (id === actor.userId && input.status === "DISABLED") throw forbidden();
  const access = input.role || input.loginType ? resolveAccess({ ...input, loginType: input.loginType ?? before.loginType }, Boolean(actor.simple)) : null;
  // The login type of a user never changes (a role keeps to the same login).
  if (access && access.loginType !== before.loginType) throw badRequest("errors.validation", { role: "validation.invalid" });
  const data: Prisma.UserUpdateInput = {
    ...(input.name ? { name: input.name } : {}),
    ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(access ? { permissions: access.permissions } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
  await actor.db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data });
    await audit(tx, actor, {
      action: input.status && input.status !== before.status ? (input.status === "DISABLED" ? "DISABLE" : "ENABLE") : "UPDATE",
      entityType: "User",
      entityId: id,
      summary: `Login changed: ${before.loginId}`,
      category: "SYSTEM",
      oldValue: { permissions: before.permissions, status: before.status, mobile: before.mobile },
      newValue: data,
    });
  });
  if (input.status === "DISABLED" || access) await endSessionsOf({ tenantId: actor.tenantId, userId: id });
}

export async function resetPassword(actor: Actor, id: string) {
  require(actor);
  const user = await actor.db.user.findUnique({ where: { id } });
  if (!user) throw notFound();
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  await actor.db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true, failedLogins: 0, lockedUntil: null } });
    await audit(tx, actor, { action: "PASSWORD_RESET", entityType: "User", entityId: id, summary: `Password reset for ${user.loginId}`, category: "SYSTEM" });
  });
  await endSessionsOf({ tenantId: actor.tenantId, userId: id });
  return { password, name: user.name };
}
