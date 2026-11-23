import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { isoDateField } from "@/core/validators";
import { startJoining } from "@/modules/recruitment/service";

export const POST = apiRoute<{ id: string }>(async ({ actor, params, body }) => {
  const { dateOfJoining } = await body(z.object({ dateOfJoining: isoDateField.optional() }));
  const j = await startJoining(actor, params.id, dateOfJoining);
  return { id: j.id };
});
