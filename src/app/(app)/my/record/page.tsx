import type { Metadata } from "next";
import { Send } from "lucide-react";
import { NoAccess } from "@/components/no-access";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { getEmployee } from "@/modules/employees/service";
import { EmployeeProfile, HR_ONLY_TABS, PROFILE_TABS, type ProfileTab } from "../../employees/_components/profile";

export const metadata: Metadata = { title: "My record" };

export default async function MyRecordPage({ searchParams }: { searchParams: Promise<{ tab?: string; fy?: string; year?: string }> }) {
  const actor = await requireActor();
  if (!actor.employeeId) return <NoAccess />;
  const { t, locale } = await getT();
  const { tab, ...filters } = await searchParams;
  const e = await getEmployee(actor, actor.employeeId);
  const active = (PROFILE_TABS as readonly string[]).includes(tab ?? "") && !HR_ONLY_TABS.includes(tab as ProfileTab) ? (tab as ProfileTab) : "personal";
  return (
    <div>
      <PageHeader
        title={t("my.recordTitle")}
        description={t("my.recordSubtitle")}
        actions={
          actor.isEmployee && (
            <LinkButton href="/my/requests?new=1" variant="primary" icon={<Send className="size-4" aria-hidden="true" />}>
              {t("my.requestChange")}
            </LinkButton>
          )
        }
      />
      <EmployeeProfile e={e} actor={actor} tab={active} t={t} locale={locale} mode="self" basePath="/my/record" filters={filters} />
    </div>
  );
}
