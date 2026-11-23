import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { getPlatformActor } from "@/core/auth/platform-session";
import { formatDateTime } from "@/core/dates";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";
import { listTeam } from "@/platform/team";
import { AddMember } from "./add-member";

export const metadata = { title: "Platform team" };

export default async function TeamPage() {
  const pa = (await getPlatformActor())!;
  const { t, locale } = await getT();
  const team = await listTeam();
  return (
    <>
      <PageHeader title={t("platform.team.title")} description={t("platform.team.subtitle")} actions={pa.role === "OWNER" && <AddMember />} />
      <Card>
        <Table stack>
          <THead>
            <tr>
              <Th>{t("common.name")}</Th>
              <Th>{t("platform.team.role")}</Th>
              <Th>{t("users.lastLogin")}</Th>
            </tr>
          </THead>
          <tbody>
            {team.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={m.name} size="sm" />
                    <span>
                      <span className="block font-semibold text-ink">{m.name}</span>
                      <span className="block text-xs text-muted">{m.email}</span>
                    </span>
                  </span>
                </Td>
                <Td label={t("platform.team.role")}><Badge tone={m.role === "OWNER" ? "gold" : "neutral"}>{tDynamic(t, `platform.team.${m.role}`)}</Badge></Td>
                <Td label={t("users.lastLogin")} className="text-muted">{m.lastLoginAt ? formatDateTime(m.lastLoginAt, locale) : t("users.never")}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
