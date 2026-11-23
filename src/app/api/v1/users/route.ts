import { apiRoute } from "@/core/api/route";
import { createUser, userSchema } from "@/modules/users/service";

export const POST = apiRoute(async ({ actor, body }) => createUser(actor, await body(userSchema)));
