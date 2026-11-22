import { publicRoute } from "@/core/api/route";
import { otpBody } from "@/modules/auth/schemas";
import { platformConfirmOtp } from "@/platform/auth";

export const POST = publicRoute(async ({ body, meta }) => platformConfirmOtp((await body(otpBody)).code, meta));
