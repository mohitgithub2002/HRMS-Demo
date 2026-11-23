import { apiRoute } from "@/core/api/route";
import { resetPassword } from "@/modules/users/service";

export const POST = apiRoute<{ id: string }>(async ({ actor, params }) => resetPassword(actor, params.id));
