import { publicRoute } from "@/core/api/route";
import { otpBody } from "@/modules/auth/schemas";
import { confirmLoginOtp } from "@/modules/auth/service";

export const POST = publicRoute(async ({ body, meta }) => confirmLoginOtp((await body(otpBody)).code, meta));
