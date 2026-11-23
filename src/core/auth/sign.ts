import "server-only";
/**
 * Signing codes (PRD §2 rule 4): approving a pay bill — or anything else that moves money — needs a one-time code sent
 * to the signer's own mobile, and the code works only for the item it was sent for. OtpChallenge is a platform table,
 * so this lives in core; modules ask through these three functions.
 */
import type { Prisma } from "@/generated/prisma/client";
import { AppError, badRequest, tooMany } from "@/core/errors";
import { devHelpersEnabled } from "@/core/env";
import { rawDb } from "@/core/tenancy/raw";
import { tenantDb } from "@/core/tenancy/scoped";
import { issueOtp, maskMobile, verifyOtp } from "./otp";
import { sendSms } from "@/core/connectors/sms";

export interface SignContext {
  kind: string;
  id: string;
  /** "pay bill 2026-10 REGULAR" — shown in the SMS. */
  what: string;
}

interface Signer {
  tenantId: string;
  userId: string;
  db: Parameters<typeof sendSms>[0];
  language?: "en" | "hi";
}

/** How long a used code keeps counting for the item it signed (the approval that follows reads it). */
export const SIGN_WINDOW_MS = 10 * 60 * 1000;

/** Sends a signing code to the signer's mobile. */
export async function startSignOtp(signer: Signer, context: SignContext): Promise<{ challengeId: string; sentTo: string; devOtp?: string }> {
  const user = await tenantDb(signer.tenantId).user.findFirst({ where: { id: signer.userId }, select: { mobile: true } });
  if (!user?.mobile) throw badRequest("auth.noMobile");
  const r = await issueOtp({ tenantId: signer.tenantId, userId: signer.userId, purpose: "SIGN", sentTo: user.mobile, cooldown: false });
  if (!r.ok) throw tooMany(r.problem === "too_many" ? "auth.otpTooMany" : "errors.rateLimited");
  await rawDb().otpChallenge.update({ where: { id: r.challengeId }, data: { context: context as unknown as Prisma.InputJsonValue } });
  await sendSms(signer.db, user.mobile, "approveOtp", { otp: r.code, what: context.what }, signer.language ?? "en");
  return { challengeId: context.id, sentTo: maskMobile(user.mobile), ...(devHelpersEnabled() ? { devOtp: r.code } : {}) };
}

/** Checks a signing code for one item; throws a plain-words error when it is wrong, old or for something else. */
export async function checkSignOtp(signer: Pick<Signer, "tenantId" | "userId">, code: string, item: { kind: string; id: string }) {
  const latest = await rawDb().otpChallenge.findFirst({ where: { userId: signer.userId, tenantId: signer.tenantId, purpose: "SIGN", consumedAt: null }, orderBy: { createdAt: "desc" } });
  const ctx = latest?.context as { kind?: string; id?: string } | null | undefined;
  if (!latest || ctx?.kind !== item.kind || ctx.id !== item.id) throw new AppError(400, "otp_expired", "errors.otpExpired");
  const result = await verifyOtp(signer.userId, "SIGN", code);
  if (result === "wrong") throw new AppError(400, "otp_wrong", "auth.otpWrong");
  if (result === "used_up") throw new AppError(429, "otp_too_many", "errors.otpTooMany");
  if (result !== "ok") throw new AppError(400, "otp_expired", "errors.otpExpired");
  // Marked as signed (a code that was only replaced by a newer one is also "consumed", but never signed anything).
  await rawDb().otpChallenge.update({ where: { id: latest.id }, data: { context: { ...(ctx as object), signedAt: new Date().toISOString() } as Prisma.InputJsonValue } });
}

/** True when this person used a signing code for this item in the last few minutes. */
export async function wasSigned(signer: Pick<Signer, "tenantId" | "userId">, itemId: string, windowMs = SIGN_WINDOW_MS): Promise<boolean> {
  const used = await rawDb().otpChallenge.findMany({
    where: { userId: signer.userId, tenantId: signer.tenantId, purpose: "SIGN", consumedAt: { gte: new Date(Date.now() - windowMs) } },
    select: { context: true },
  });
  return used.some((c) => {
    const ctx = c.context as { id?: string; signedAt?: string } | null;
    return ctx?.id === itemId && Boolean(ctx.signedAt);
  });
}
