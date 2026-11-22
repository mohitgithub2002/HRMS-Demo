import "server-only";
/** The platform team: owners change organisations, support people only read. */
import { z } from "zod";
import type { PlatformActor } from "@/core/auth/platform-session";
import { temporaryPassword } from "@/core/crypto";
import { conflict, forbidden } from "@/core/errors";
import { hashPassword } from "@/core/password";
import { rawDb } from "@/core/tenancy/raw";
import { platformAudit } from "./audit";

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email("validation.email"),
  role: z.enum(["OWNER", "SUPPORT"]),
});

export async function listTeam() {
  return rawDb().platformUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } });
}

export async function addTeamMember(pa: PlatformActor, input: z.infer<typeof teamMemberSchema>) {
  if (pa.role !== "OWNER") throw forbidden();
  if (await rawDb().platformUser.findUnique({ where: { email: input.email } })) throw conflict("errors.duplicateCode", undefined, { email: "errors.duplicateCode" });
  const password = temporaryPassword();
  const user = await rawDb().platformUser.create({ data: { ...input, passwordHash: await hashPassword(password), mustChangePassword: true } });
  await platformAudit({ userId: pa.userId, name: pa.name, ip: pa.ip }, { action: "TEAM_ADD", summary: `Added ${user.email} as ${user.role}` });
  return { id: user.id, password };
}
