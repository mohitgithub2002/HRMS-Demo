import { cookies } from "next/headers";
import { z } from "zod";
import { publicRoute } from "@/core/api/route";
import { LOCALE_COOKIE } from "@/core/i18n/types";
import { secureCookies } from "@/core/env";

/** Language for this browser, and for the login when someone is signed in. Works on the sign-in screen too. */
export const POST = publicRoute(async ({ body, actor }) => {
  const { language } = await body(z.object({ language: z.enum(["en", "hi"]) }));
  (await cookies()).set(LOCALE_COOKIE, language, { httpOnly: false, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  if (actor) await actor.db.user.update({ where: { id: actor.userId }, data: { locale: language } });
  return null;
});
