/** The platform's limits for an organisation (most users, most employees), read where they are enforced. */
import { rawDb } from "./raw";

export async function tenantLimits(tenantId: string) {
  const t = await rawDb().tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { maxUsers: true, maxEmployees: true } });
  return t;
}
