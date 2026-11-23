import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { canAll } from "@/core/auth/access";
import { forbidden } from "@/core/errors";
import { previewLoan } from "@/modules/payroll/loans";

export const POST = apiRoute(async ({ actor, body }) => {
  if (!canAll(actor, "arrears_loans", "create")) throw forbidden();
  return previewLoan(await body(z.unknown()));
});
