import { platformRoute } from "@/core/api/route";
import { setTenantStatus, statusSchema } from "@/platform/tenants";

export const POST = platformRoute<{ id: string }>(async ({ pa, params, body }) => {
  await setTenantStatus(pa, params.id, await body(statusSchema));
  return null;
});
