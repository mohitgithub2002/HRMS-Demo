import { z } from "zod";
import { platformRoute } from "@/core/api/route";
import { provisionTenant, type ProvisionInput } from "@/platform/provision";

/**
 * Create an organisation (platform owner only). provisionTenant validates the body itself; a known password is a
 * seed-only option and is removed here. The Admin's one-time password is in the answer, once.
 */
export const POST = platformRoute(
  async ({ pa, body, meta }) => {
    const raw = await body(z.record(z.string(), z.unknown()));
    delete raw.adminPassword;
    const { tenant, admin } = await provisionTenant(raw as ProvisionInput, { userId: pa.userId, name: pa.name, ip: meta.ip });
    return { id: tenant.id, code: tenant.code, name: tenant.name, admin };
  },
  { owner: true },
);
