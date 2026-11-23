import { Activity, Building2, CircleCheck, Hourglass, PauseCircle, Plus, Users, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { getPlatformActor } from "@/core/auth/platform-session";
import { formatDateTime } from "@/core/dates";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";
import { platformDashboard } from "@/platform/tenants";
import { STATUS_TONE } from "@/platform/ui";

export const metadata = { title: "Console" };

export default async function ConsoleHome() {
  const pa = (await getPlatformActor())!;
  const { t, locale } = await getT();
  const d = await platformDashboard();
  const fmt = new Intl.NumberFormat("en-IN");
  return (
    <>
      <PageHeader
        eyebrow={t("platform.console")}
        title={t("platform.dashboard.title")}
        description={t("platform.dashboard.subtitle")}
        actions={pa.role === "OWNER" && <LinkButton href="/platform/orgs/new" variant="primary" icon={<Plus />}>{t("platform.orgs.new")}</LinkButton>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("platform.dashboard.orgs")} value={d.total} icon={<Building2 />} href="/platform/orgs" />
        <StatTile label={t("platform.dashboard.active")} value={d.status.ACTIVE ?? 0} icon={<CircleCheck />} tone="success" />
        <StatTile label={t("platform.dashboard.trial")} value={d.status.TRIAL ?? 0} icon={<Hourglass />} tone="gold" />
        <StatTile label={t("platform.dashboard.suspended")} value={d.status.SUSPENDED ?? 0} icon={<PauseCircle />} tone="danger" />
        <StatTile label={t("platform.dashboard.users")} value={fmt.format(d.users)} icon={<Users />} />
        <StatTile label={t("platform.dashboard.employees")} value={fmt.format(d.employees)} icon={<Users />} />
        <StatTile label={t("platform.dashboard.signedInToday")} value={d.signedInToday} icon={<UserRoundCheck />} tone="success" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title={t("platform.dashboard.recent")} icon={<Building2 />} />
          <ul className="divide-y divide-line border-t border-line">
            {d.recent.map((o) => (
              <li key={o.id}>
                <Link href={`/platform/orgs/${o.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2 sm:px-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold text-white" style={{ background: o.accentColor ?? "var(--color-brand-700)" }}>
                    {o.code.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{o.name}</span>
                    <span className="block text-xs text-muted">{o.code} · {tDynamic(t, `platform.kind.${o.kind}`)}</span>
                  </span>
                  <Badge tone={STATUS_TONE[o.status]} dot>{tDynamic(t, `platform.status.${o.status}`)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
          {d.recent.length === 0 && <EmptyState title={t("platform.orgs.empty")} />}
        </Card>
        <Card>
          <CardHeader title={t("platform.dashboard.activity")} icon={<Activity />} />
          <ol className="space-y-4 border-t border-line px-5 py-5 sm:px-6">
            {d.activity.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold-400" />
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{a.summary}</span>
                  <span className="block text-xs text-muted">{a.userName} · {formatDateTime(a.createdAt, locale)}</span>
                </span>
              </li>
            ))}
            {d.activity.length === 0 && <li className="text-sm text-muted">{t("platform.audit.empty")}</li>}
          </ol>
        </Card>
      </div>
    </>
  );
}
