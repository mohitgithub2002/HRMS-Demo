import { apiRoute } from "@/core/api/route";
import { passwordBody } from "@/modules/auth/schemas";
import { changePassword } from "@/modules/auth/service";

export const POST = apiRoute(async ({ actor, body, meta }) => {
  await changePassword(actor, await body(passwordBody), meta);
  return null;
});
