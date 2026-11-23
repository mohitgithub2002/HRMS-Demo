import { apiRoute } from "@/core/api/route";
import { getSeparation } from "@/modules/employees/separation";

export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getSeparation(actor, params.id));
