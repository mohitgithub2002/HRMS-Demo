import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getActor } from "@/core/auth/session";
import { makeT } from "@/i18n";
import { LOCALE_COOKIE, type Locale } from "./types";

/** The language chosen on the sign-in screen or in My profile, remembered in a cookie. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "hi" ? "hi" : "en";
});

/** Whether the organisation works the simple way — it changes some wording. */
export const getSimple = cache(async (): Promise<boolean> => {
  try {
    return Boolean((await getActor())?.simple);
  } catch {
    return false;
  }
});

export async function getT() {
  const [locale, simple] = await Promise.all([getLocale(), getSimple()]);
  return { t: makeT(locale, simple), locale, simple };
}
