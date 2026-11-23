import { publicRoute } from "@/core/api/route";
import { logout } from "@/modules/auth/service";

export const POST = publicRoute(async () => {
  await logout();
  return null;
});
