import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { canSeeSensitive, scopeFor } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { formatDateTime } from "@/core/dates";
import { getT } from "@/core/i18n/server";

export const metadata = { title: "Audit trail" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requireActor();
  const scope = scopeFor(actor, "audit_trail", "view");
  if (!scope) notFound();
  const { t, locale } = await getT();
  const q = (await searchParams).q?.trim();
  // The User & settings manager sees system events only, and never pay, bank or Aadhaar (§2 rule 3).
  const where: Prisma.AuditLogWhereInput = {
    ...(scope === "system" ? { category: "SYSTEM" } : {}),
    ...(canSeeSensitive(actor) ? {} : { isSensitive: false }),
    ...(q ? { OR: [{ summary: { contains: q, mode: "insensitive" } }, { userName: { contains: q, mode: "insensitive" } }, { action: { contains: q.toUpperCase() } }] } : {}),
  };
  const rows = await actor.db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader eyebrow={t("nav.admin")} title={t("audit.title")} description={scope === "system" ? t("audit.systemOnly") : t("audit.subtitle")} />
      <Card>
        <form className="border-b border-line p-4 sm:px-6" role="search">
          <label className="relative block max-w-md">
            <span className="sr-only">{t("common.search")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <input name="q" defaultValue={q} placeholder={t("common.searchPlaceholder")} className="h-10 w-full rounded-xl border border-line bg-surface-2 pr-3 pl-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15" />
          </label>
        </form>
        {rows.length === 0 ? (
          <EmptyState title={t("audit.empty")} />
        ) : (
          <Table stack>
            <THead>
              <tr>
                <Th>{t("audit.when")}</Th>
                <Th>{t("audit.who")}</Th>
                <Th>{t("audit.action")}</Th>
                <Th>{t("audit.what")}</Th>
              </tr>
            </THead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt, locale)}</Td>
                  <Td label={t("audit.who")}>
                    <span className="block text-ink">{r.userName ?? "—"}</span>
                    {r.ip && <span className="block text-xs text-faint">{r.ip}</span>}
                  </Td>
                  <Td label={t("audit.action")}><Badge tone={r.category === "SYSTEM" ? "neutral" : "brand"}>{r.action}</Badge></Td>
                  <Td label={t("audit.what")} className="text-ink">{r.summary}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
