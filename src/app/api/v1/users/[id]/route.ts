import { apiRoute } from "@/core/api/route";
import { updateUser, updateUserSchema } from "@/modules/users/service";

export const PATCH = apiRoute<{ id: string }>(async ({ actor, params, body }) => {
  await updateUser(actor, params.id, await body(updateUserSchema));
  return null;
});
