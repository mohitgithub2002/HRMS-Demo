import { publicRoute } from "@/core/api/route";
import { resendLoginOtp } from "@/modules/auth/service";

export const POST = publicRoute(async () => resendLoginOtp());
