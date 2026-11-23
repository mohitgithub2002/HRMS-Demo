import "server-only";
/**
 * Signing in to the platform console: email + password, then a one-time code (to the email; shown on screen in
 * practice copies). Five wrong passwords lock the account for 15 minutes.
 */
import { createPlatformSession, endPlatformSession, pendingPlatformSession, verifyPlatformSession, type PlatformActor } from "@/core/auth/platform-session";
import { issueOtp, maskEmail, verifyOtp } from "@/core/auth/otp";
import { deliver } from "@/core/connectors/messages";
import { devHelpersEnabled } from "@/core/env";
import { AppError, badRequest, tooMany } from "@/core/errors";
import { hashPassword, verifyPassword } from "@/core/password";
import { checkPassword } from "@/core/password-policy";
import type { RequestMeta } from "@/core/request-meta";
import { rawDb } from "@/core/tenancy/raw";
import { platformAudit } from "./audit";

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;

export type PlatformStep = { step: "otp"; to: string; devCode?: string } | { step: "done" };

async function sendCode(user: { id: string; email: string }): Promise<PlatformStep> {
  const r = await issueOtp({ tenantId: null, userId: user.id, purpose: "PLATFORM_LOGIN", sentTo: user.email });
  if (!r.ok) throw tooMany(r.problem === "too_many" ? "auth.otpTooMany" : "errors.rateLimited");
  await deliver({ channel: "EMAIL", to: user.email, template: "platform_otp", subject: "Your Kosh console code", text: `Your console sign-in code is ${r.code}. It works for 5 minutes.` });
  return { step: "otp", to: maskEmail(user.email), ...(devHelpersEnabled() ? { devCode: r.code } : {}) };
}

export async function platformLogin(input: { email: string; password: string }, meta: RequestMeta): Promise<PlatformStep> {
  const db = rawDb();
  const user = await db.platformUser.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  const now = Date.now();
  if (user?.lockedUntil && user.lockedUntil.getTime() > now) throw new AppError(429, "locked", "auth.locked", { minutes: Math.ceil((user.lockedUntil.getTime() - now) / 60000) });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok || !user.isActive) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.platformUser.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= LOCK_AFTER ? new Date(now + LOCK_MS) : null } });
    }
    throw badRequest("errors.validation", { password: "auth.badCredentials" });
  }
  await db.platformUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const step = await sendCode(user);
  await createPlatformSession(user.id, false, meta);
  return step;
}

export async function platformConfirmOtp(code: string, meta: RequestMeta): Promise<PlatformStep> {
  const s = await pendingPlatformSession();
  if (!s || s.verifiedAt) throw badRequest("errors.validation", { code: "auth.otpExpired" });
  const result = await verifyOtp(s.platformUserId, "PLATFORM_LOGIN", code.trim());
  if (result !== "ok") throw badRequest("errors.validation", { code: result === "wrong" ? "auth.otpWrong" : "auth.otpExpired" });
  await verifyPlatformSession(s.id);
  await rawDb().platformUser.update({ where: { id: s.platformUserId }, data: { lastLoginAt: new Date() } });
  await platformAudit({ userId: s.user.id, name: s.user.name, ip: meta.ip }, { action: "LOGIN", summary: "Signed in to the console" });
  return { step: "done" };
}

export async function platformResendOtp(): Promise<PlatformStep> {
  const s = await pendingPlatformSession();
  if (!s || s.verifiedAt) throw badRequest("errors.validation", { code: "auth.otpExpired" });
  return sendCode(s.user);
}

export async function platformLogout() {
  await endPlatformSession();
}

export async function platformChangePassword(pa: PlatformActor, input: { current: string; next: string }) {
  const user = await rawDb().platformUser.findUniqueOrThrow({ where: { id: pa.userId } });
  if (!(await verifyPassword(input.current, user.passwordHash))) throw badRequest("errors.validation", { current: "auth.wrongCurrent" });
  if (checkPassword(input.next).length) throw badRequest("errors.validation", { next: "validation.passwordRules" });
  await rawDb().platformUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.next), mustChangePassword: false } });
  await rawDb().platformSession.deleteMany({ where: { platformUserId: user.id, id: { not: pa.sessionId } } });
  await platformAudit({ userId: pa.userId, name: pa.name, ip: pa.ip }, { action: "PASSWORD_CHANGE", summary: "Changed own password" });
}
