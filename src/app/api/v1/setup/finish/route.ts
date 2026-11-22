import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { finishSetup } from "@/modules/org/service";

export const POST = apiRoute(async ({ actor, body }) => {
  await finishSetup(actor, (await body(z.object({ done: z.boolean() }))).done);
  return null;
});
