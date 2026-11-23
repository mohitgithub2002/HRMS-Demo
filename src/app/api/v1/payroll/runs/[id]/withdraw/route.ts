import { apiRoute } from "@/core/api/route";
import { withdrawRun } from "@/modules/payroll/run";

export const POST = apiRoute<{ id: string }>(async ({ actor, params }) => {
  await withdrawRun(actor, params.id);
  return { ok: true };
});
