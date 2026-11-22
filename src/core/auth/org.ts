/** The organisation behind a code typed at sign-in — only what the sign-in screen needs. */
import { rawDb } from "@/core/tenancy/raw";
import { usableTenant } from "./tenant-status";

export async function findOrg(code: string) {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(clean)) return null;
  const t = await rawDb().tenant.findUnique({ where: { code: clean } });
  if (!t) return null;
  return { id: t.id, code: t.code, name: t.name, nameHi: t.nameHi, status: t.status, accentColor: t.accentColor, usable: usableTenant(t.status) };
}
