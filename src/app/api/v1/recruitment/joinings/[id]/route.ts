import { apiRoute } from "@/core/api/route";
import { getJoining } from "@/modules/recruitment/service";

export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getJoining(actor, params.id));
