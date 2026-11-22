import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import type { TenantStatus } from "@/generated/prisma/enums";
import { getPlatformActor } from "@/core/auth/platform-session";
import { formatDate } from "@/core/dates";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";
import { listTenants } from "@/platform/tenants";
import { STATUS_TONE } from "@/platform/ui";

export const metadata = { title: "Organisations" };

const STATUSES: TenantStatus[] = ["ACTIVE", "TRIAL", "SUSPENDED", "CLOSED"];

export default async function OrgsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const pa = (await getPlatformActor())!;
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as TenantStatus) ? (sp.status as TenantStatus) : undefined;
  const { t, locale } = await getT();
  const orgs = await listTenants({ q: sp.q, status });
  return (
    <>
      <PageHeader
        title={t("platform.orgs.title")}
        description={t("platform.orgs.subtitle")}
        actions={pa.role === "OWNER" && <LinkButton href="/platform/orgs/new" variant="primary" icon={<Plus />}>{t("platform.orgs.new")}</LinkButton>}
      />
      <LinkTabs
        active={status ?? "all"}
        tabs={[{ key: "all", label: t("common.all"), href: "/platform/orgs" }, ...STATUSES.map((s) => ({ key: s, label: tDynamic(t, `platform.status.${s}`), href: `/platform/orgs?status=${s}` }))]}
      />
      <Card>
        <form className="border-b border-line p-4 sm:px-6" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="relative block max-w-md">
            <span className="sr-only">{t("common.search")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <input name="q" defaultValue={sp.q} placeholder={t("platform.orgs.search")} className="h-10 w-full rounded-xl border border-line bg-surface-2 pr-3 pl-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15" />
          </label>
        </form>
        {orgs.length === 0 ? (
          <EmptyState icon={<Building2 />} title={t("platform.orgs.empty")} />
        ) : (
          <Table stack>
            <THead>
              <tr>
                <Th>{t("platform.orgs.columns.org")}</Th>
                <Th>{t("platform.orgs.columns.status")}</Th>
                <Th>{t("platform.orgs.columns.modules")}</Th>
                <Th align="right">{t("platform.orgs.columns.users")}</Th>
                <Th align="right">{t("platform.orgs.columns.employees")}</Th>
                <Th>{t("platform.orgs.columns.created")}</Th>
              </tr>
            </THead>
            <tbody>
              {orgs.map((o) => (
                <Tr key={o.id} interactive>
                  <Td>
                    <Link href={`/platform/orgs/${o.id}`} className="flex items-center gap-3 focus:outline-none">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl font-display text-xs font-semibold text-white" style={{ background: o.accentColor ?? "var(--color-brand-700)" }}>
                        {o.code.slice(0, 2)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{o.name}</span>
                        <span className="block text-xs text-muted">{o.code}{o.city ? ` · ${o.city}` : ""}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td label={t("platform.orgs.columns.status")}><Badge tone={STATUS_TONE[o.status]} dot>{tDynamic(t, `platform.status.${o.status}`)}</Badge></Td>
                  <Td label={t("platform.orgs.columns.modules")}>{t("platform.orgs.modulesCount", { n: o.modules.length })}</Td>
                  <Td label={t("platform.orgs.columns.users")} align="right">{o.users}</Td>
                  <Td label={t("platform.orgs.columns.employees")} align="right">{o.employees}</Td>
                  <Td label={t("platform.orgs.columns.created")}>{formatDate(o.createdAt, locale)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
