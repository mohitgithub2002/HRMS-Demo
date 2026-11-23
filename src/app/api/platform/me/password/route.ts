import { platformRoute } from "@/core/api/route";
import { passwordBody } from "@/modules/auth/schemas";
import { platformChangePassword } from "@/platform/auth";

export const POST = platformRoute(async ({ pa, body }) => {
  await platformChangePassword(pa, await body(passwordBody));
  return null;
});
