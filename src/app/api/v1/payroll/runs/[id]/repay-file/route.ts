import { apiRoute } from "@/core/api/route";
import { buildRepayFile } from "@/modules/payroll/pay";

export const POST = apiRoute<{ id: string }>(async ({ actor, params }) => {
  const file = await buildRepayFile(actor, params.id);
  return { fileId: file.id };
});
