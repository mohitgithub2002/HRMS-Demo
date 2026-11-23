import { platformRoute } from "@/core/api/route";
import { resetTenantAdmin } from "@/platform/tenants";

export const POST = platformRoute<{ id: string; userId: string }>(async ({ pa, params }) => resetTenantAdmin(pa, params.id, params.userId));
