import "server-only";
/**
 * The organisation's own structure: its profile (name, address, colour), sections and posts. Changed by the
 * User & settings manager or the Admin (and HR for sections and posts); every change is in the audit trail.
 */
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { can, canManageUsers, isFullAdmin } from "@/core/auth/access";
import type { Actor } from "@/core/auth/session";
import { audit, diff } from "@/core/audit";
import { conflict, forbidden, notFound } from "@/core/errors";
import { getTenantProfile, setSetupCompleted, updateTenantProfile } from "@/core/tenancy/tenant";

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

function requireOrgAdmin(actor: Actor) {
  if (!(canManageUsers(actor) || isFullAdmin(actor))) throw forbidden();
}

function requireStructure(actor: Actor) {
  if (!(canManageUsers(actor) || isFullAdmin(actor) || can(actor, "employee_master", "create"))) throw forbidden();
}

// ── Profile ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z.string().trim().min(3).max(120),
  nameHi: opt(120),
  shortName: opt(40),
  address: opt(300),
  city: opt(60),
  state: opt(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "validation.pincode").optional().or(z.literal("")).nullable().transform((v) => v || null),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "validation.colour").optional().or(z.literal("")).nullable().transform((v) => v || null),
});

export async function updateProfile(actor: Actor, input: z.infer<typeof profileSchema>) {
  requireOrgAdmin(actor);
  const before = await getTenantProfile(actor.tenantId);
  await updateTenantProfile(actor.tenantId, input);
  const { oldValue, newValue, changed } = diff(before as unknown as Record<string, unknown>, input);
  if (changed.length) {
    await audit(actor.db, actor, { action: "UPDATE", entityType: "Organisation", entityId: actor.tenantId, summary: `Organisation profile changed: ${changed.join(", ")}`, category: "SYSTEM", oldValue, newValue });
  }
}

export async function finishSetup(actor: Actor, done: boolean) {
  if (!isFullAdmin(actor)) throw forbidden();
  await setSetupCompleted(actor.tenantId, done);
  await audit(actor.db, actor, { action: done ? "SETUP_FINISHED" : "SETUP_REOPENED", entityType: "Organisation", entityId: actor.tenantId, summary: done ? "Setup marked as finished" : "Setup checklist shown again", category: "SYSTEM" });
}

// ── Sections ────────────────────────────────────────────────────────────────────────────────────────────────────

export const sectionSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,10}$/, "validation.code"),
  name: z.string().trim().min(2).max(80),
  nameHi: opt(80),
  attendanceMode: z.enum(["DEVICE", "MANUAL"]).default("DEVICE"),
  weeklyOff: z.string().regex(/^[0-6](,[0-6])*$/).optional().or(z.literal("")).nullable().transform((v) => v || null),
  isActive: z.boolean().default(true),
});

export async function listSections(actor: Actor) {
  return actor.db.section.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
}

export async function saveSection(actor: Actor, id: string | null, input: z.infer<typeof sectionSchema>) {
  requireStructure(actor);
  return actor.db.$transaction(async (tx) => {
    const clash = await tx.section.findFirst({ where: { code: input.code, ...(id ? { id: { not: id } } : {}) } });
    if (clash) throw conflict("errors.duplicateCode", undefined, { code: "errors.duplicateCode" });
    if (!id) {
      const s = await tx.section.create({ data: input as Prisma.SectionUncheckedCreateInput });
      await audit(tx, actor, { action: "CREATE", entityType: "Section", entityId: s.id, summary: `Section added: ${s.name} (${s.code})`, newValue: input });
      return s;
    }
    const before = await tx.section.findUnique({ where: { id } });
    if (!before) throw notFound();
    const s = await tx.section.update({ where: { id }, data: input });
    const d = diff(before as unknown as Record<string, unknown>, input);
    await audit(tx, actor, { action: "UPDATE", entityType: "Section", entityId: id, summary: `Section changed: ${s.name}`, oldValue: d.oldValue, newValue: d.newValue });
    return s;
  });
}

// ── Posts ───────────────────────────────────────────────────────────────────────────────────────────────────────

export const postSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,10}$/, "validation.code"),
  name: z.string().trim().min(2).max(80),
  nameHi: opt(80),
  payLevel: z.string().trim().min(1).max(10),
  group: z.enum(["A", "B", "C", "D"]),
  retirementAge: z.number().int().min(50).max(70),
  isActive: z.boolean().default(true),
});

export async function listPosts(actor: Actor) {
  return actor.db.post.findMany({ orderBy: [{ isActive: "desc" }, { group: "asc" }, { name: "asc" }] });
}

export async function savePost(actor: Actor, id: string | null, input: z.infer<typeof postSchema>) {
  requireStructure(actor);
  return actor.db.$transaction(async (tx) => {
    const clash = await tx.post.findFirst({ where: { code: input.code, ...(id ? { id: { not: id } } : {}) } });
    if (clash) throw conflict("errors.duplicateCode", undefined, { code: "errors.duplicateCode" });
    if (!id) {
      const p = await tx.post.create({ data: input as Prisma.PostUncheckedCreateInput });
      await audit(tx, actor, { action: "CREATE", entityType: "Post", entityId: p.id, summary: `Post added: ${p.name} (${p.code})`, newValue: input });
      return p;
    }
    const before = await tx.post.findUnique({ where: { id } });
    if (!before) throw notFound();
    const p = await tx.post.update({ where: { id }, data: input });
    const d = diff(before as unknown as Record<string, unknown>, input);
    await audit(tx, actor, { action: "UPDATE", entityType: "Post", entityId: id, summary: `Post changed: ${p.name}`, oldValue: d.oldValue, newValue: d.newValue });
    return p;
  });
}
