import { z } from "zod";
import { decide } from "@/core/approvals";
import { apiRoute } from "@/core/api/route";

export const POST = apiRoute<{ id: string }>(async ({ actor, params, body }) => {
  const input = await body(z.object({ decision: z.enum(["APPROVE", "REJECT", "RETURN"]), note: z.string().max(500).optional() }));
  const task = await decide(actor, params.id, input.decision, input.note ?? null);
  return { id: task.id, status: task.status };
});
