import { apiRoute } from "@/core/api/route";
import { profileSchema, updateProfile } from "@/modules/org/service";

export const PUT = apiRoute(async ({ actor, body }) => {
  await updateProfile(actor, await body(profileSchema));
  return null;
});
