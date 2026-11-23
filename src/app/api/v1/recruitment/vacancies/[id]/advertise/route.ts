import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { markAdvertised } from "@/modules/recruitment/service";

export const POST = apiRoute<{ id: string }>(async ({ actor, params, body }) => {
  await markAdvertised(actor, params.id, await body(z.unknown()));
  return { ok: true };
});
