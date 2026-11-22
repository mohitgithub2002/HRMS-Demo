import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { getPlatformActor } from "@/core/auth/platform-session";
import { AppError } from "@/core/errors";
import { formatDate, formatDateTime } from "@/core/dates";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";
import { getTenant } from "@/platform/tenants";
import { STATUS_TONE } from "@/platform/ui";
import { OrgControls } from "./org-controls";

export const metadata = { title: "Organisation" };

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const pa = (await getPlatformActor())!;
  const { t, locale } = await getT();
  const data = await getTenant((await params).id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const o = data.tenant;
  return (
    <>
      <PageHeader
        eyebrow={`${o.code} · ${tDynamic(t, `platform.kind.${o.kind}`)}`}
        title={o.name}
        description={[o.nameHi, o.city, o.state].filter(Boolean).join(" · ")}
        actions={
          <>
            <Badge tone={STATUS_TONE[o.status]} dot>{tDynamic(t, `platform.status.${o.status}`)}</Badge>
            <LinkButton href={`/o/${o.code}`} target="_blank" variant="secondary" size="sm" icon={<ExternalLink />}>{t("platform.org.signInPage")}</LinkButton>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("platform.orgs.columns.users")} value={`${data.users} / ${o.maxUsers}`} />
        <StatTile label={t("platform.orgs.columns.employees")} value={`${data.employees} / ${o.maxEmployees}`} />
        <StatTile label={t("platform.org.setup")} value={o.setupCompletedAt ? t("platform.org.setupDone") : t("platform.org.setupOpen")} tone={o.setupCompletedAt ? "success" : "gold"} />
        <StatTile label={t("platform.org.lastActivity")} value={data.lastActivity ? formatDate(data.lastActivity, locale) : "—"} hint={t("platform.org.created", { date: formatDate(o.createdAt, locale) })} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <OrgControls
          owner={pa.role === "OWNER"}
          org={{ id: o.id, status: o.status, modules: o.modules, maxUsers: o.maxUsers, maxEmployees: o.maxEmployees, plan: o.plan, suspendedReason: o.suspendedReason }}
          admins={data.admins.map((a) => ({ id: a.id, loginId: a.loginId, name: a.name, status: a.status, locked: Boolean(a.lockedUntil && a.lockedUntil > new Date()) }))}
        />
        <Card>
          <CardHeader title={t("platform.org.activity")} />
          <ol className="space-y-4 border-t border-line px-5 py-5 sm:px-6">
            {data.activity.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold-400" />
                <span>
                  <span className="block text-sm text-ink">{a.summary}</span>
                  <span className="block text-xs text-muted">{a.userName} · {formatDateTime(a.createdAt, locale)}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
