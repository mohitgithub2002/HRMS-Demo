import type { TKey } from "@/i18n";

/** Good morning / afternoon / evening by the hour in India. */
export function greetingKey(now = new Date()): TKey {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(now));
  return h < 12 ? "home.morning" : h < 17 ? "home.afternoon" : "home.evening";
}
