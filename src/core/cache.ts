import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import type { Actor } from "@/core/auth/session";
import { todayIST } from "@/core/dates";

/**
 * Short-lived caching of figures that are slow to work out and the same from one visit to the next — the counts and
 * lists on Home. Each entry belongs to one person in one organisation (the key carries everything their access
 * depends on), lives at most `seconds`, and is thrown away the moment anything in the organisation changes: every
 * successful change through the API calls orgChanged() (core/api/route.ts). Background work (a payroll run worked out
 * after the response, the daily jobs) shows within `seconds`.
 *
 * Only for values that survive JSON (strings, numbers, plain objects) — Next keeps them in its data cache, which on
 * Vercel is shared by every instance, so a change on one is seen by all.
 */
export const orgTag = (tenantId: string) => `kosh-org:${tenantId}`;

export function cachedForPerson<T>(actor: Actor, name: string, work: () => Promise<T>, seconds = 60): Promise<T> {
  const who = [
    actor.tenantId,
    actor.userId,
    actor.loginType,
    actor.simple ? "simple" : "two-step",
    [...actor.permissions].sort().join(","),
    [...(actor.modules ?? actor.tenant.modules)].sort().join(","),
    actor.employeeId ?? "-",
    actor.pensionerId ?? "-",
    actor.sectionId ?? "-",
    actor.isEmployee ? "e" : "-",
    actor.isPensioner ? "p" : "-",
    actor.tenant.setupDone ? "ready" : "setup",
    // Figures such as "due in 5 days" move at midnight.
    todayIST(),
  ];
  return unstable_cache(work, ["kosh", name, ...who], { tags: [orgTag(actor.tenantId)], revalidate: seconds })();
}

/** Something in the organisation changed: its cached figures are worked out afresh on the next visit. */
export function orgChanged(tenantId: string) {
  try {
    revalidateTag(orgTag(tenantId), { expire: 0 });
  } catch {
    // Outside a request (scripts, tests) there is no cache to clear.
  }
}
