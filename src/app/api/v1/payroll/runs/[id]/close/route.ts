import { apiRoute } from "@/core/api/route";
import { closeRun } from "@/modules/payroll/pay";

export const POST = apiRoute<{ id: string }>(async ({ actor, params }) => {
  const file = await closeRun(actor, params.id);
  return { fileId: file.id };
});
