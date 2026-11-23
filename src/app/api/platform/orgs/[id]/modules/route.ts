import { platformRoute } from "@/core/api/route";
import { modulesSchema, setTenantModules } from "@/platform/tenants";

export const POST = platformRoute<{ id: string }>(async ({ pa, params, body }) => ({ modules: await setTenantModules(pa, params.id, await body(modulesSchema)) }));
