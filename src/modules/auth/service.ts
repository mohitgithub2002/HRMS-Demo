import "server-only";
/**
 * Signing in to an organisation (PRD §2): organisation code + Employee ID / username + password, then a one-time
 * code to the login's mobile; employees and pensioners may use mobile + code alone. Five wrong passwords lock the
 * login for 15 minutes. No answer ever tells whether an ID exists.
 */
import { cookies } from "next/headers";
import type { User } from "@/generated/prisma/client";
import { audit } from "@/core/audit";
import { issueOtp, maskMobile, verifyOtp } from "@/core/auth/otp";
import { SESSION_COOKIE, clearSessionCookie, createSession, currentSessionRow, endSession, endSessionsOf, setSessionCookie, verifySession } from "@/core/auth/session";
import { sendSms } from "@/core/connectors/sms";
import { devHelpersEnabled } from "@/core/env";
import { AppError, badRequest, tooMany } from "@/core/errors";
import { hashPassword, verifyPassword } from "@/core/password";
import { checkPassword } from "@/core/password-policy";
import type { RequestMeta } from "@/core/request-meta";
import { findOrg } from "@/core/auth/org";
import { tenantDb, type TenantDb } from "@/core/tenancy/scoped";
import { getSetting } from "@/modules/settings/store";

export const LOCK_AFTER = 5;
export const LOCK_MS = 15 * 60 * 1000;

export { findOrg };

async function orgOrFail(code: string) {
  const org = await findOrg(code);
  if (!org) throw badRequest("errors.validation", { org: "auth.unknownOrg" });
  if (!org.usable) throw new AppError(403, "org_suspended", "errors.orgSuspended");
  return org;
}

export type LoginStep = { step: "otp"; to: string; devCode?: string } | { step: "done"; mustChangePassword: boolean };

async function startOtp(db: TenantDb, tenantId: string, user: User): Promise<LoginStep> {
  if (!user.mobile) throw badRequest("errors.validation", { loginId: "auth.noMobile" });
  const r = await issueOtp({ tenantId, userId: user.id, purpose: "LOGIN", sentTo: user.mobile });
  if (!r.ok) throw tooMany(r.problem === "too_many" ? "auth.otpTooMany" : "errors.rateLimited");
  await sendSms(db, user.mobile, "otp", { otp: r.code }, user.locale === "hi" ? "hi" : "en");
  return { step: "otp", to: maskMobile(user.mobile), ...(devHelpersEnabled() ? { devCode: r.code } : {}) };
}

export async function loginWithPassword(input: { org: string; loginId: string; password: string }, meta: RequestMeta): Promise<LoginStep> {
  const org = await orgOrFail(input.org);
  const db = tenantDb(org.id);
  const loginId = input.loginId.trim().toUpperCase();
  const user = await db.user.findFirst({ where: { loginId: { equals: loginId, mode: "insensitive" } } });
  const now = Date.now();
  if (user?.lockedUntil && user.lockedUntil.getTime() > now) {
    throw new AppError(429, "locked", "auth.locked", { minutes: Math.ceil((user.lockedUntil.getTime() - now) / 60000) });
  }
  // Hash something even when there is no such login, so timing gives nothing away.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= LOCK_AFTER ? new Date(now + LOCK_MS) : null } });
        await audit(tx, { userId: user.id, name: user.name, loginType: user.loginType, ...meta }, { action: "LOGIN_FAILED", entityType: "User", entityId: user.id, summary: "Wrong password", category: "SYSTEM" });
      });
    }
    throw badRequest("errors.validation", { password: "auth.badCredentials" });
  }
  if (user.status !== "ACTIVE") throw badRequest("errors.validation", { loginId: "auth.disabled" });
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const security = await getSetting(db, "security");
  if (!security.loginOtp) return finishLogin(db, org.id, user, meta, null);
  const step = await startOtp(db, org.id, user);
  const s = await createSession({ tenantId: org.id, userId: user.id, verified: false, ...meta });
  await setSessionCookie(s.token, s.expiresAt);
  return step;
}

/** Employees and pensioners: mobile number + code (when the organisation allows it). */
export async function loginWithMobile(input: { org: string; mobile: string }, meta: RequestMeta): Promise<LoginStep> {
  const org = await orgOrFail(input.org);
  const db = tenantDb(org.id);
  const security = await getSetting(db, "security");
  const mobile = input.mobile.replace(/\D/g, "").slice(-10);
  const user = security.mobileOtpLogin ? await db.user.findFirst({ where: { mobile, loginType: "EMPLOYEE", status: "ACTIVE" } }) : null;
  // Same answer whether or not the number is known (no account probing).
  if (!user) return { step: "otp", to: maskMobile(mobile) };
  const step = await startOtp(db, org.id, user);
  const s = await createSession({ tenantId: org.id, userId: user.id, verified: false, ...meta });
  await setSessionCookie(s.token, s.expiresAt);
  return step;
}

export async function resendLoginOtp(): Promise<LoginStep> {
  const s = await currentSessionRow();
  if (!s || s.verifiedAt) throw badRequest("errors.validation", { code: "auth.otpExpired" });
  const db = tenantDb(s.tenantId);
  const user = await db.user.findUnique({ where: { id: s.userId } });
  if (!user) throw badRequest("errors.validation", { code: "auth.otpExpired" });
  return startOtp(db, s.tenantId, user);
}

export async function confirmLoginOtp(code: string, meta: RequestMeta): Promise<LoginStep> {
  const s = await currentSessionRow();
  if (!s || s.verifiedAt) throw badRequest("errors.validation", { code: "auth.otpExpired" });
  const result = await verifyOtp(s.userId, "LOGIN", code.trim());
  if (result !== "ok") {
    if (result !== "wrong") await endSession(s.id);
    throw badRequest("errors.validation", { code: result === "wrong" ? "auth.otpWrong" : "auth.otpExpired" });
  }
  const db = tenantDb(s.tenantId);
  const user = await db.user.findUnique({ where: { id: s.userId } });
  if (!user || user.status !== "ACTIVE") throw badRequest("errors.validation", { code: "auth.disabled" });
  return finishLogin(db, s.tenantId, user, meta, s.id);
}

async function finishLogin(db: TenantDb, tenantId: string, user: User, meta: RequestMeta, pendingSessionId: string | null): Promise<LoginStep> {
  if (pendingSessionId) {
    // Same token, now verified: only its lifetime on the cookie grows.
    const expiresAt = await verifySession(pendingSessionId);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await setSessionCookie(token, expiresAt);
  } else {
    const s = await createSession({ tenantId, userId: user.id, verified: true, ...meta });
    await setSessionCookie(s.token, s.expiresAt);
  }
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit(tx, { userId: user.id, name: user.name, loginType: user.loginType, ...meta }, { action: "LOGIN", entityType: "User", entityId: user.id, summary: "Signed in", category: "SYSTEM" });
  });
  return { step: "done", mustChangePassword: user.mustChangePassword };
}

export async function logout() {
  const s = await currentSessionRow();
  if (s) await endSession(s.id);
  await clearSessionCookie();
}

/** My profile → change password (and the forced change at first sign-in). Signs out other devices. */
export async function changePassword(actor: { tenantId: string; userId: string; sessionId: string; name: string }, input: { current: string; next: string }, meta: RequestMeta) {
  const db = tenantDb(actor.tenantId);
  const user = await db.user.findUnique({ where: { id: actor.userId } });
  if (!user || !(await verifyPassword(input.current, user.passwordHash))) throw badRequest("errors.validation", { current: "auth.wrongCurrent" });
  if (checkPassword(input.next).length) throw badRequest("errors.validation", { next: "validation.passwordRules" });
  const passwordHash = await hashPassword(input.next);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() } });
    await audit(tx, { userId: user.id, name: user.name, loginType: user.loginType, ...meta }, { action: "PASSWORD_CHANGE", entityType: "User", entityId: user.id, summary: "Changed own password", category: "SYSTEM" });
  });
  await endSessionsOf({ tenantId: actor.tenantId, userId: user.id, exceptSessionId: actor.sessionId });
}
