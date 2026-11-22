import { z } from "zod";
import { apiRoute } from "@/core/api/route";
import { canManageUsers } from "@/core/auth/access";
import { forbidden, notFound } from "@/core/errors";
import { SETTING_KEYS, SETTINGS, type SettingKey } from "@/modules/settings/schema";
import { saveSetting } from "@/modules/settings/store";

export const PUT = apiRoute<{ key: string }>(async ({ actor, params, body }) => {
  if (!canManageUsers(actor)) throw forbidden();
  if (!SETTING_KEYS.includes(params.key as SettingKey)) throw notFound();
  const key = params.key as SettingKey;
  const value = await body(SETTINGS[key] as unknown as z.ZodType<unknown>);
  await saveSetting(actor.db, actor, key, value as never);
  return null;
});
