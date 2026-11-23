/**
 * Creating an organisation (platform console → New organisation, and the seed).
 *
 *  1. The tenant row (platform table).
 *  2. In ONE tenant transaction: the starter pack's masters, the first Admin login, the audit entry.
 *  3. The platform audit entry.
 *
 * If step 2 fails nothing of the organisation stays behind: its tenant row is removed again. The first Admin gets a
 * one-time password, returned once and stored only as a hash.
 *
 * Not "server-only": the seed provisions the demo organisations through the same path as the console.
 */
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/core/audit";
import { temporaryPassword } from "@/core/crypto";
import { todayIST } from "@/core/dates";
import { AppError, conflict } from "@/core/errors";
import { hashPassword } from "@/core/password";
import { normaliseModules, MODULES } from "@/core/tenancy/modules";
import { rawDb } from "@/core/tenancy/raw";
import { tenantDb } from "@/core/tenancy/scoped";
import { installersFor, PACK_VERSION } from "./packs";
import { PACKS, TENANT_KINDS } from "./packs/types";
import { platformAudit } from "./audit";

const mobile = z.string().trim().regex(/^[6-9]\d{9}$/, "validation.mobile");
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

export const provisionSchema = z.object({
  name: z.string().trim().min(3).max(120),
  nameHi: opt(120),
  shortName: opt(40),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,12}$/, "validation.code"),
  kind: z.enum(TENANT_KINDS as [string, ...string[]]),
  city: opt(60),
  state: opt(60),
  contactName: opt(80),
  contactEmail: z.string().trim().email("validation.email").optional().or(z.literal("")).transform((v) => v || null),
  contactPhone: opt(20),
  status: z.enum(["TRIAL", "ACTIVE"]).default("TRIAL"),
  trialDays: z.number().int().min(1).max(365).default(30),
  maxUsers: z.number().int().min(1).max(100_000).default(500),
  maxEmployees: z.number().int().min(1).max(1_000_000).default(5000),
  modules: z.array(z.enum(MODULES)).default([]),
  pack: z.enum(PACKS as [string, ...string[]]).default("GOI_7CPC"),
  admin: z.object({
    name: z.string().trim().min(2).max(80),
    loginId: z.string().trim().toUpperCase().regex(/^[A-Z0-9._-]{3,30}$/, "validation.code"),
    mobile,
    email: z.string().trim().email("validation.email").optional().or(z.literal("")).transform((v) => v || null),
  }),
  /** Seed only: a known password for demo logins. */
  adminPassword: z.string().min(8).optional(),
});

export type ProvisionInput = z.input<typeof provisionSchema>;

export interface ProvisionedBy {
  userId: string | null;
  name: string;
  ip?: string | null;
}

export async function provisionTenant(raw: ProvisionInput, by: ProvisionedBy) {
  const input = provisionSchema.parse(raw);
  const modules = normaliseModules(input.modules);
  const db = rawDb();
  if (await db.tenant.findUnique({ where: { code: input.code } })) {
    throw conflict("errors.duplicateCode", undefined, { code: "platform.create.codeTaken" });
  }
  const tenant = await db.tenant.create({
    data: {
      code: input.code,
      name: input.name,
      nameHi: input.nameHi,
      shortName: input.shortName,
      kind: input.kind,
      city: input.city,
      state: input.state,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      status: input.status,
      trialEndsAt: input.status === "TRIAL" ? new Date(Date.now() + input.trialDays * 86_400_000) : null,
      maxUsers: input.maxUsers,
      maxEmployees: input.maxEmployees,
      modules,
      pack: input.pack,
      packVersion: PACK_VERSION,
      createdById: by.userId,
    },
  });

  const password = input.adminPassword ?? temporaryPassword();
  const passwordHash = await hashPassword(password);
  try {
    await tenantDb(tenant.id).$transaction(
      async (tx) => {
        const ctx = { tenantId: tenant.id, kind: input.kind as never, modules, today: todayIST() };
        for (const part of installersFor(input.pack as never)) {
          if (part.module && !modules.includes(part.module)) continue;
          await part.install(tx, ctx);
        }
        const admin = await tx.user.create({
          data: {
            loginId: input.admin.loginId,
            name: input.admin.name,
            loginType: "ADMIN",
            permissions: ["APPROVER", "PAY_BILL_SIGNER"],
            mobile: input.admin.mobile,
            email: input.admin.email,
            passwordHash,
            mustChangePassword: !input.adminPassword,
          } as Prisma.UserUncheckedCreateInput,
        });
        await audit(tx, { name: `Platform · ${by.name}`, ip: by.ip ?? null }, {
          action: "PROVISION",
          entityType: "Tenant",
          entityId: tenant.id,
          summary: `Organisation created with the ${input.pack} pack; first Admin ${admin.loginId}`,
          category: "SYSTEM",
          newValue: { modules, pack: input.pack, admin: admin.loginId },
        });
      },
      { timeout: 60_000 },
    );
  } catch (e) {
    // Leave nothing half-made. Tenant rows have nothing pointing at them outside the failed transaction.
    await db.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    if (e instanceof AppError) throw e;
    throw e;
  }

  await platformAudit(by, { action: "TENANT_CREATE", tenantId: tenant.id, summary: `Created ${tenant.name} (${tenant.code})`, data: { modules, pack: input.pack, status: input.status } });
  return { tenant, admin: { loginId: input.admin.loginId, password } };
}
