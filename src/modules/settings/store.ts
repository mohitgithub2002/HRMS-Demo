/**
 * Reading and writing organisation settings. Reads go through the tenant client, so an organisation only ever sees
 * its own; all keys are read in one query.
 */
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { audit, type AuditWho } from "@/core/audit";
import type { DbLike, TenantDb } from "@/core/tenancy/scoped";
import { readValue, SETTING_KEYS, SETTINGS, type SettingKey, type SettingValue } from "./schema";

export type AllSettings = { [K in SettingKey]: SettingValue<K> };

export async function getSettings(db: DbLike): Promise<AllSettings> {
  const rows = await db.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, readValue(k, byKey.get(k))])) as AllSettings;
}

/**
 * All settings of the organisation, read once per page render (React's per-request cache): the sign-in check, the
 * layout and the page all ask for settings, and they share one query. Only for the organisation's client — a
 * transaction always reads afresh — and outside a page render (API routes, actions, scripts) it simply reads.
 */
export const requestSettings = cache((db: TenantDb): Promise<AllSettings> => getSettings(db));

const isTenantClient = (db: DbLike): db is TenantDb => typeof (db as { tenantId?: unknown }).tenantId === "string";

export async function getSetting<K extends SettingKey>(db: DbLike, key: K): Promise<SettingValue<K>> {
  if (isTenantClient(db)) return (await requestSettings(db))[key];
  const row = await db.setting.findFirst({ where: { key } });
  return readValue(key, row?.value);
}

/** Saves one setting (validated) with its audit entry, in one transaction. */
export async function saveSetting<K extends SettingKey>(db: TenantDb, who: AuditWho, key: K, value: SettingValue<K>) {
  const clean = SETTINGS[key].parse(value) as Prisma.InputJsonValue;
  return db.$transaction(async (tx) => {
    const before = await tx.setting.findFirst({ where: { key } });
    if (before) await tx.setting.update({ where: { id: before.id }, data: { value: clean, updatedBy: who.userId ?? null } });
    else await tx.setting.create({ data: { key, value: clean, updatedBy: who.userId ?? null } as Prisma.SettingUncheckedCreateInput });
    await audit(tx, who, {
      action: "SETTING",
      entityType: "Setting",
      entityId: key,
      summary: `Changed setting: ${key}`,
      category: "SYSTEM",
      oldValue: before?.value ?? null,
      newValue: clean,
      sensitive: key === "bank",
    });
  });
}
