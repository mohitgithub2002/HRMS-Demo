/**
 * The organisation's statutory settings (TAN, DDO registration, professional tax …), for code that also runs outside
 * Next.js (payroll working, seed). Same merge-over-defaults rule as the settings store.
 */
import type { DbLike } from "@/core/tenancy/scoped";
import { getSetting } from "@/modules/settings/store";
import { orgOf } from "@/core/tenancy/tenant";
import type { SettingValue } from "@/modules/settings/schema";

export type StatutorySettings = SettingValue<"statutory">;

/** An organisation that has not filled in its deductor name and address yet uses its own name and address. */
export async function statutorySettings(tx: DbLike): Promise<StatutorySettings> {
  const s = await getSetting(tx, "statutory");
  if (s.deductorName && s.address) return s;
  const org = await orgOf(tx);
  return { ...s, deductorName: s.deductorName || org.name.slice(0, 75), address: s.address || [org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ").slice(0, 200) };
}
