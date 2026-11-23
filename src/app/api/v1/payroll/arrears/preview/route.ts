import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { previewArrears } from "@/modules/payroll/arrears";

export const POST = apiRoute(async ({ actor, body }) => previewArrears(actor, await body(z.unknown())));
