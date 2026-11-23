import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { requestUnlock } from "@/modules/attendance/service";

export const POST = apiRoute(async ({ actor, body }) => {
  const task = await requestUnlock(actor, await body(z.unknown()));
  return { taskId: task.id };
});
