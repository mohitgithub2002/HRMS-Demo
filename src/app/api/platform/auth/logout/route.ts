import { publicRoute } from "@/core/api/route";
import { platformLogout } from "@/platform/auth";

export const POST = publicRoute(async () => {
  await platformLogout();
  return null;
});
