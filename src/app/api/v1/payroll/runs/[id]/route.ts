import { apiRoute } from "@/core/api/route";
import { getRun } from "@/modules/payroll/run";

export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getRun(actor, params.id));
