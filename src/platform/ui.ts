import type { TenantStatus } from "@/generated/prisma/enums";
import type { Tone } from "@/components/ui/badge";

export const STATUS_TONE: Record<TenantStatus, Tone> = { ACTIVE: "success", TRIAL: "gold", SUSPENDED: "danger", CLOSED: "neutral" };
