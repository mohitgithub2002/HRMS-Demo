import { platformRoute } from "@/core/api/route";
import { limitsSchema, setTenantLimits } from "@/platform/tenants";

export const POST = platformRoute<{ id: string }>(async ({ pa, params, body }) => {
  await setTenantLimits(pa, params.id, await body(limitsSchema));
  return null;
});
