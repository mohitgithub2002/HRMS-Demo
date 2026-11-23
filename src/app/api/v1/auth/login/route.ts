import { cookies } from "next/headers";
import { publicRoute } from "@/core/api/route";
import { secureCookies } from "@/core/env";
import { loginBody } from "@/modules/auth/schemas";
import { loginWithMobile, loginWithPassword } from "@/modules/auth/service";

export const ORG_COOKIE = "kosh_org";

export const POST = publicRoute(async ({ body, meta }) => {
  const input = await body(loginBody);
  const result = "password" in input ? await loginWithPassword(input, meta) : await loginWithMobile(input, meta);
  // The sign-in screen remembers the organisation for next time (not a secret: the code is printed on letters).
  (await cookies()).set(ORG_COOKIE, input.org.toUpperCase(), { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  return result;
});
