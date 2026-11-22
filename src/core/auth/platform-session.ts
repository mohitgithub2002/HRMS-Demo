import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { PlatformRole } from "@/generated/prisma/enums";
import { randomToken, sha256 } from "@/core/crypto";
import { secureCookies } from "@/core/env";
import { rawDb } from "@/core/tenancy/raw";

/** The platform console has its own cookie and its own sessions: an organisation login never opens it. */
export const PLATFORM_COOKIE = "kosh_platform";
const IDLE_MS = 30 * 60 * 1000;
const LIFETIME_MS = 12 * 60 * 60 * 1000;
const PENDING_MS = 10 * 60 * 1000;

export interface PlatformActor {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  role: PlatformRole;
  mustChangePassword: boolean;
  ip: string | null;
}

export async function createPlatformSession(userId: string, verified: boolean, meta: { ip: string | null; userAgent: string | null }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + (verified ? LIFETIME_MS : PENDING_MS));
  await rawDb().platformSession.create({
    data: { tokenHash: sha256(token), platformUserId: userId, verifiedAt: verified ? new Date() : null, expiresAt, ip: meta.ip, userAgent: meta.userAgent },
  });
  (await cookies()).set(PLATFORM_COOKIE, token, { httpOnly: true, secure: secureCookies(), sameSite: "strict", path: "/", expires: expiresAt });
}

export async function pendingPlatformSession() {
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;
  if (!token) return null;
  const s = await rawDb().platformSession.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!s || s.expiresAt.getTime() < Date.now() || !s.user.isActive) return null;
  return s;
}

export async function verifyPlatformSession(sessionId: string) {
  const expiresAt = new Date(Date.now() + LIFETIME_MS);
  await rawDb().platformSession.update({ where: { id: sessionId }, data: { verifiedAt: new Date(), lastSeenAt: new Date(), expiresAt } });
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;
  if (token) (await cookies()).set(PLATFORM_COOKIE, token, { httpOnly: true, secure: secureCookies(), sameSite: "strict", path: "/", expires: expiresAt });
}

export async function endPlatformSession() {
  const s = await pendingPlatformSession();
  if (s) await rawDb().platformSession.deleteMany({ where: { id: s.id } });
  (await cookies()).delete(PLATFORM_COOKIE);
}

export const getPlatformActor = cache(async (): Promise<PlatformActor | null> => {
  const s = await pendingPlatformSession();
  if (!s || !s.verifiedAt) return null;
  if (Date.now() - s.lastSeenAt.getTime() > IDLE_MS) {
    await rawDb().platformSession.deleteMany({ where: { id: s.id } });
    return null;
  }
  if (Date.now() - s.lastSeenAt.getTime() > 30_000) await rawDb().platformSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  return { userId: s.user.id, sessionId: s.id, email: s.user.email, name: s.user.name, role: s.user.role, mustChangePassword: s.user.mustChangePassword, ip: s.ip };
});
