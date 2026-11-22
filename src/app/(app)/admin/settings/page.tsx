import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { canManageUsers } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { getSettings } from "@/modules/settings/store";
import { SettingsForms } from "./settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const actor = await requireActor();
  if (!canManageUsers(actor)) notFound();
  const { t } = await getT();
  const s = await getSettings(actor.db);
  return (
    <>
      <PageHeader eyebrow={t("nav.admin")} title={t("settings.title")} description={t("settings.subtitle")} />
      <SettingsForms initial={s} />
    </>
  );
}
