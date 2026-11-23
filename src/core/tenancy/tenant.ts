/**
 * The organisation's own row in the platform table, read and changed only for the signed-in organisation's id.
 * Not "server-only": provisioning uses it.
 */
import { rawDb } from "./raw";

export async function getTenantProfile(tenantId: string) {
  const t = await rawDb().tenant.findUniqueOrThrow({ where: { id: tenantId } });
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    nameHi: t.nameHi,
    shortName: t.shortName,
    kind: t.kind,
    address: t.address,
    city: t.city,
    state: t.state,
    pincode: t.pincode,
    accentColor: t.accentColor,
    modules: t.modules,
    setupCompletedAt: t.setupCompletedAt,
  };
}

export type TenantProfile = Awaited<ReturnType<typeof getTenantProfile>>;

/** The fields an organisation's Admin may change about itself (code, status, modules and limits are the platform's). */
export async function updateTenantProfile(tenantId: string, data: { name: string; nameHi: string | null; shortName: string | null; address: string | null; city: string | null; state: string | null; pincode: string | null; accentColor: string | null }) {
  return rawDb().tenant.update({ where: { id: tenantId }, data });
}

export async function setSetupCompleted(tenantId: string, done: boolean) {
  return rawDb().tenant.update({ where: { id: tenantId }, data: { setupCompletedAt: done ? new Date() : null } });
}

/** The organisation of a tenant client, as documents print it (letterheads, PPO numbers, bank narrations). */
export async function orgOf(db: import("./scoped").DbLike) {
  const { tenantOf } = await import("./scoped");
  const t = await getTenantProfile(tenantOf(db));
  return { ...t, nameHi: t.nameHi || t.name };
}
