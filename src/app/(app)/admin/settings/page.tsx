import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { canManageUsers } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { getSettings } from "@/modules/settings/store";
import { SettingsForms } from "./settings-forms";
import { AskCard } from "./ask-card";
import { askConfig, canConfigureAsk } from "@/modules/ask/config";
import { askRoleReady } from "@/modules/ask/runner";
import { canManageKnowledge } from "@/core/auth/access";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const actor = await requireActor();
  if (!canManageUsers(actor)) notFound();
  const { t } = await getT();
  const [s, askSetup, roleReady] = await Promise.all([getSettings(actor.db), askConfig(actor.db), askRoleReady()]);
  return (
    <>
      <PageHeader eyebrow={t("nav.admin")} title={t("settings.title")} description={t("settings.subtitle")} />
      {actor.modules?.includes("ask") && (
        <div className="mb-6">
          <AskCard initial={askSetup} readOnly={!canConfigureAsk(actor)} roleReady={roleReady} canWriteDocs={canManageKnowledge(actor)} />
        </div>
      )}
      <SettingsForms initial={s} />
    </>
  );
}
