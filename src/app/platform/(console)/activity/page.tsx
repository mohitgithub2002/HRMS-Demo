import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatDateTime } from "@/core/dates";
import { getT } from "@/core/i18n/server";
import { listPlatformAudit } from "@/platform/tenants";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const { t, locale } = await getT();
  const rows = await listPlatformAudit(200);
  return (
    <>
      <PageHeader title={t("platform.audit.title")} description={t("platform.audit.subtitle")} />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title={t("platform.audit.empty")} />
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
                  <Td label={t("audit.who")}>{r.userName}</Td>
                  <Td label={t("audit.action")}><code className="rounded bg-sunken px-1.5 py-0.5 text-xs">{r.action}</code></Td>
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
