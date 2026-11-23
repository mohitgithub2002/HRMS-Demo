import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { enterLeave } from "@/modules/leave/service";

export const POST = apiRoute(async ({ actor, body }) => {
  const a = await enterLeave(actor, await body(z.unknown()));
  return { id: a.id };
});
