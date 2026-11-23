import { z } from "zod";
import { publicRoute } from "@/core/api/route";
import { platformLogin } from "@/platform/auth";

export const POST = publicRoute(async ({ body, meta }) => platformLogin(await body(z.object({ email: z.string().trim().email("validation.email"), password: z.string().min(1).max(200) })), meta));
