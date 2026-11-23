import { publicRoute } from "@/core/api/route";
import { platformResendOtp } from "@/platform/auth";

export const POST = publicRoute(async () => platformResendOtp());
