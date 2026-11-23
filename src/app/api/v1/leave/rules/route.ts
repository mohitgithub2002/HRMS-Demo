import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { forbidden } from "@/core/errors";
import { can } from "@/core/auth/access";
import { leaveRules } from "@/modules/leave/balance";
import { proposeLeaveRule } from "@/modules/leave/service";

export const GET = apiRoute(async ({ actor }) => {
  if (!can(actor, "leave", "view") && !can(actor, "rates_rules", "view")) throw forbidden();
  return leaveRules(actor.db);
});
export const POST = apiRoute(async ({ actor, body }) => {
  const task = await proposeLeaveRule(actor, await body(z.unknown()));
  return { taskId: task.id };
});
