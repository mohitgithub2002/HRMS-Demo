import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserPlus, Users } from "lucide-react";
import { NoAccess } from "@/components/no-access";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RowLink } from "@/components/ui/row-link";
import { Table, Td, Th, THead } from "@/components/ui/table";
import { canAll } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { formatDate, formatMonth } from "@/core/dates";
import { tDynamic } from "@/i18n";
import { getT } from "@/core/i18n/server";
import { formatINR } from "@/core/money";
import { cn } from "@/lib/utils";
import { listPensioners } from "@/modules/pension/pensioners";
import { PENSION_TYPE_LABEL } from "@/modules/pension/rules";
import { LC_TONE, PensionTabs } from "../_components/pension-tabs";

export const metadata: Metadata = { title: "Pensioners" };

const STATUSES = ["ACTIVE", "STOPPED", "ALL"] as const;

/** S-60: every pensioner with the pension now, life certificate status and the last pension paid. */
export default async function PensionersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const actor = await requireActor();
  if (!canAll(actor, "pension", "view")) return <NoAccess />;
  const { t, locale } = await getT();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof STATUSES)[number]) : "ACTIVE";
  const data = await listPensioners(actor, { q: sp.q, status });
  const qs = (s: string) => `/pension/pensioners?status=${s}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;

  return (
    <div>
      <PageHeader
        title={t("pension.title")}
        description={t("pension.pensioners.subtitle")}
        actions={
          data.canManage && (
            <LinkButton href="/pension/pensioners/new" variant="secondary" icon={<UserPlus className="size-4" />}>
              {t("pension.pensioners.add")}
            </LinkButton>
          )
        }
      />
      <PensionTabs active="pensioners" t={t} />
      <Card>
        <CardHeader
          title={t("pension.tabs.pensioners")}
          icon={<Users className="size-4.5" aria-hidden="true" />}
          actions={
            <div className="flex flex-wrap gap-1 rounded-xl bg-sunken p-1" role="group">
              {STATUSES.map((s) => (
                <Link key={s} href={qs(s)} aria-current={status === s ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", status === s ? "bg-surface text-brand-800 shadow-card" : "text-muted hover:text-ink")}>
                  {tDynamic(t, `pension.pensioners.status.${s}`)} <span className="tabular text-muted">{s === "ACTIVE" ? data.counts.active : s === "STOPPED" ? data.counts.stopped : data.counts.active + data.counts.stopped}</span>
                </Link>
              ))}
            </div>
          }
        />
        <CardBody className="border-b border-line py-3">
          <form action="/pension/pensioners" className="flex flex-wrap items-center gap-2" role="search">
            <input type="hidden" name="status" value={status} />
            <label htmlFor="q" className="sr-only">
              {t("pension.pensioners.search")}
            </label>
            <input id="q" name="q" defaultValue={sp.q ?? ""} placeholder={t("pension.pensioners.search")} className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:max-w-sm" />
            <Button type="submit" variant="secondary" size="sm" icon={<Search className="size-4" />}>
              {t("common.search")}
            </Button>
          </form>
        </CardBody>
        {data.rows.length === 0 ? (
          <CardBody>
            <p className="text-sm text-muted">{t("pension.pensioners.none")}</p>
          </CardBody>
        ) : (
          <Table stack>
            <THead>
              <tr>
                <Th>{t("pension.pensioners.pensioner")}</Th>
                <Th>{t("pension.pensioners.kind")}</Th>
                <Th align="right">{t("pension.pensioners.basic")}</Th>
                <Th>{t("pension.pensioners.certificate")}</Th>
                <Th align="right">{t("pension.pensioners.lastPaid")}</Th>
              </tr>
            </THead>
            <tbody>
              {data.rows.map((p) => (
                <RowLink key={p.id} href={`/pension/pensioners/${p.id}`}>
                  <Td>
                    <Link href={`/pension/pensioners/${p.id}`} className="font-medium text-ink hover:text-brand-700">
                      {locale === "hi" && p.payeeHi ? p.payeeHi : p.payee}
                    </Link>
                    <span className="block text-xs text-muted">
                      {p.ppoNumber} · {t("pension.pensioners.age", { age: p.age })}
                      {p.of && ` · ${t("pension.bills.of", { name: p.of })}`}
                    </span>
                  </Td>
                  <Td label={t("pension.pensioners.kind")}>
                    {PENSION_TYPE_LABEL[p.type]?.[locale === "hi" ? 1 : 0] ?? p.type}
                    {p.status === "STOPPED" && <span className="block text-xs text-red-700">{t("pension.pensioners.stoppedOn", { date: formatDate(p.endDate, locale) })}</span>}
                  </Td>
                  <Td label={t("pension.pensioners.basic")} align="right">
                    {formatINR(p.basic)}
                    {p.commutedNow && p.restoredOn && <span className="block text-xs text-muted">{t("pension.pensioners.commutedTill", { amount: formatINR(p.commuted), date: formatDate(p.restoredOn, locale) })}</span>}
                  </Td>
                  <Td label={t("pension.pensioners.certificate")}>
                    {p.status === "ACTIVE" ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge tone={LC_TONE[p.lc.state]} dot>
                          {tDynamic(t, `pension.lc.state.${p.lc.state}`)}
                        </Badge>
                        {p.lc.waiting > 0 && <Badge tone="blue">{t("pension.lc.waiting")}</Badge>}
                        <span className="block w-full text-xs text-muted">{t("pension.lc.until", { date: formatDate(p.lc.validTill, locale) })}</span>
                      </div>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </Td>
                  <Td label={t("pension.pensioners.lastPaid")} align="right">
                    {p.lastPaid ? (
                      <>
                        <span className={cn("font-semibold", p.lastPaid.held ? "text-amber-700" : "text-ink")}>{formatINR(p.lastPaid.net)}</span>
                        <span className="block text-xs text-muted">
                          {formatMonth(p.lastPaid.month, locale)}
                          {p.lastPaid.held && ` · ${t("payroll.withheld")}`}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>
                </RowLink>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
