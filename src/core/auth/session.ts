import "server-only";
import { cookies } from "next/headers";
import { after } from "next/server";
import { cache } from "react";
import type { LoginType, Permission, TenantStatus } from "@/generated/prisma/enums";
import { randomToken, sha256 } from "@/core/crypto";
import { secureCookies } from "@/core/env";
import { rawDb } from "@/core/tenancy/raw";
import { tenantDb, type TenantDb } from "@/core/tenancy/scoped";
import { assertRlsEnforced } from "@/core/tenancy/platform";
import { readValue } from "@/modules/settings/schema";
import type { Principal } from "./access";
import { resolvePerson } from "./person";
import { usableTenant } from "./tenant-status";

export const SESSION_COOKIE = "kosh_session";
/** PRD §2 rule 7: sessions end after 15 minutes idle. */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ABSOLUTE_LIFETIME_MS = 12 * 60 * 60 * 1000;
/** A session waiting for its OTP lives this long. */
const PENDING_LIFETIME_MS = 10 * 60 * 1000;
const TOUCH_INTERVAL_MS = 30 * 1000;

/** The organisation as a signed-in person sees it. */
export interface TenantInfo {
  id: string;
  code: string;
  name: string;
  nameHi: string | null;
  shortName: string | null;
  status: TenantStatus;
  modules: string[];
  accentColor: string | null;
  setupDone: boolean;
}

/** Everything a service needs to know about who is acting — and for which organisation. */
export interface Actor extends Principal {
  tenantId: string;
  tenant: TenantInfo;
  /** The organisation's database client (every query runs as this organisation). */
  db: TenantDb;
  userId: string;
  sessionId: string;
  loginId: string;
  name: string;
  loginType: LoginType;
  permissions: Permission[];
  employeeId: string | null;
  pensionerId: string | null;
  sectionId: string | null;
  language: "en" | "hi";
  mustChangePassword: boolean;
  ip: string | null;
  userAgent: string | null;
}

export { usableTenant };

export async function createSession(input: { tenantId: string; userId: string; verified: boolean; ip: string | null; userAgent: string | null }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + (input.verified ? ABSOLUTE_LIFETIME_MS : PENDING_LIFETIME_MS));
  await rawDb().session.create({
    data: {
      tokenHash: sha256(token),
      tenantId: input.tenantId,
      userId: input.userId,
      verifiedAt: input.verified ? new Date() : null,
      expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The session row behind the cookie, verified or not (sign-in uses the pending one for the OTP step). */
export async function currentSessionRow() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await rawDb().session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!s || s.expiresAt.getTime() < Date.now()) return null;
  return s;
}

/** Marks a pending session as signed in (the OTP was right) and gives it a full lifetime. */
export async function verifySession(sessionId: string) {
  const expiresAt = new Date(Date.now() + ABSOLUTE_LIFETIME_MS);
  await rawDb().session.update({ where: { id: sessionId }, data: { verifiedAt: new Date(), lastSeenAt: new Date(), expiresAt } });
  return expiresAt;
}

export async function endSession(sessionId: string) {
  await rawDb().session.deleteMany({ where: { id: sessionId } });
}

/** Ends every session of a login, or every session of an organisation (suspension). */
export async function endSessionsOf(where: { tenantId: string; userId?: string; exceptSessionId?: string }) {
  await rawDb().session.deleteMany({
    where: { tenantId: where.tenantId, ...(where.userId ? { userId: where.userId } : {}), ...(where.exceptSessionId ? { id: { not: where.exceptSessionId } } : {}) },
  });
}

export async function loadTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  const t = await rawDb().tenant.findUnique({ where: { id: tenantId } });
  if (!t) return null;
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    nameHi: t.nameHi,
    shortName: t.shortName,
    status: t.status,
    modules: t.modules,
    accentColor: t.accentColor,
    setupDone: Boolean(t.setupCompletedAt),
  };
}

/**
 * The signed-in person for this request, or null. Checks the session (verified, not idle for 15 minutes, not past
 * its lifetime), the organisation (not suspended or closed), the login (active) and the person's access.
 * Cached per request so layouts, pages and services share one lookup.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const s = await currentSessionRow();
  if (!s || !s.verifiedAt) return null;
  const now = Date.now();
  if (now - s.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) {
    await endSession(s.id);
    return null;
  }
  await assertRlsEnforced();
  const db = tenantDb(s.tenantId);
  const [tenant, user, workflow] = await Promise.all([
    loadTenantInfo(s.tenantId),
    db.user.findUnique({ where: { id: s.userId } }),
    db.setting.findFirst({ where: { key: "workflow" } }),
  ]);
  if (!tenant || !usableTenant(tenant.status) || !user || user.status !== "ACTIVE") return null;
  const person = await resolvePerson(db, user);
  if (!person.hasAccess) return null;
  if (now - s.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const touch = () => rawDb().session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).then(() => undefined, () => undefined);
    try {
      after(touch);
    } catch {
      await touch();
    }
  }
  return {
    tenantId: tenant.id,
    tenant,
    db,
    userId: user.id,
    sessionId: s.id,
    loginId: user.loginId,
    name: user.name,
    loginType: user.loginType,
    permissions: user.permissions,
    modules: tenant.modules,
    simple: readValue("workflow", workflow?.value).mode === "simple",
    employeeId: user.employeeId,
    pensionerId: person.pensionerId,
    sectionId: person.sectionId,
    isEmployee: person.isEmployee,
    isPensioner: person.isPensioner,
    language: user.locale === "hi" ? "hi" : "en",
    mustChangePassword: user.mustChangePassword,
    ip: s.ip,
    userAgent: s.userAgent,
  };
});

/** "Stay signed in": restarts the session's idle clock. */
export async function touchSession(sessionId: string) {
  await rawDb().session.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
}
