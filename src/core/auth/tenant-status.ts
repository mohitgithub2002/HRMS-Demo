import type { TenantStatus } from "@/generated/prisma/enums";

/** An organisation people may sign in to and work in. */
export function usableTenant(status: TenantStatus) {
  return status === "ACTIVE" || status === "TRIAL";
}
