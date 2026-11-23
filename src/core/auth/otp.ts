/**
 * One-time codes for sign-in, mobile changes, signing pay bills and the platform console.
 * 6 digits · 5 minutes · 5 tries · 30 s before a resend · at most 5 codes per login in 10 minutes.
 * Codes are stored only as peppered hashes. OtpChallenge is a platform table (no RLS): a code is asked for before
 * anyone is signed in, and the challenge carries its tenant.
 */
import type { OtpPurpose } from "@/generated/prisma/enums";
import { hashOtp, randomDigits, safeEqualHex } from "@/core/crypto";
import { rawDb } from "@/core/tenancy/raw";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 30 * 1000;
export const OTP_WINDOW_MS = 10 * 60 * 1000;
export const OTP_MAX_PER_WINDOW = 5;

export type OtpProblem = "too_many" | "cooldown";

/**
 * Limits count per purpose, so a sign-in code never blocks a signing code. `cooldown: false` (signing codes) skips the
 * 30-second wait: a signer may approve two different pay bills one after the other.
 */
export async function issueOtp(input: { tenantId: string | null; userId: string; purpose: OtpPurpose; sentTo: string; cooldown?: boolean }) {
  const db = rawDb();
  const now = Date.now();
  const recent = await db.otpChallenge.findMany({
    where: { userId: input.userId, purpose: input.purpose, createdAt: { gt: new Date(now - OTP_WINDOW_MS) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent.length >= OTP_MAX_PER_WINDOW) return { ok: false as const, problem: "too_many" as OtpProblem };
  if (input.cooldown !== false && recent[0] && now - recent[0].createdAt.getTime() < OTP_RESEND_MS) return { ok: false as const, problem: "cooldown" as OtpProblem, waitS: Math.ceil((OTP_RESEND_MS - (now - recent[0].createdAt.getTime())) / 1000) };
  const code = randomDigits(6);
  const challenge = await db.otpChallenge.create({
    data: { tenantId: input.tenantId, userId: input.userId, purpose: input.purpose, sentTo: input.sentTo, codeHash: "pending", expiresAt: new Date(now + OTP_TTL_MS) },
  });
  await db.otpChallenge.update({ where: { id: challenge.id }, data: { codeHash: hashOtp(challenge.id, code) } });
  // Older open codes for the same purpose stop working: only the latest counts.
  await db.otpChallenge.updateMany({ where: { userId: input.userId, purpose: input.purpose, consumedAt: null, id: { not: challenge.id } }, data: { consumedAt: new Date() } });
  return { ok: true as const, challengeId: challenge.id, code };
}

export type OtpCheck = "ok" | "wrong" | "expired" | "used_up";

/** Checks the latest open code of a login for a purpose. A right code is used up at once. */
export async function verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<OtpCheck> {
  const db = rawDb();
  const c = await db.otpChallenge.findFirst({ where: { userId, purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!c) return "expired";
  if (c.expiresAt.getTime() < Date.now()) return "expired";
  if (c.attempts >= OTP_MAX_ATTEMPTS) return "used_up";
  const right = /^\d{6}$/.test(code) && safeEqualHex(hashOtp(c.id, code), c.codeHash);
  if (!right) {
    await db.otpChallenge.update({ where: { id: c.id }, data: { attempts: { increment: 1 } } });
    return c.attempts + 1 >= OTP_MAX_ATTEMPTS ? "used_up" : "wrong";
  }
  const claimed = await db.otpChallenge.updateMany({ where: { id: c.id, consumedAt: null }, data: { consumedAt: new Date() } });
  return claimed.count === 1 ? "ok" : "expired";
}

/** "98•••••210" */
export function maskMobile(m: string): string {
  const d = m.replace(/\D/g, "");
  return d.length < 6 ? "•••" : `${d.slice(0, 2)}${"•".repeat(Math.max(0, d.length - 5))}${d.slice(-3)}`;
}

/** "an•••@example.com" */
export function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  return d ? `${u.slice(0, 2)}•••@${d}` : "•••";
}
