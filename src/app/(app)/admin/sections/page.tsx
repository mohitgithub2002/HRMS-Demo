import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { can, canManageUsers, isFullAdmin } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { listSections } from "@/modules/org/service";
import { SectionsTable } from "./sections-table";

export const metadata = { title: "Sections" };

export default async function SectionsPage() {
  const actor = await requireActor();
  if (!(canManageUsers(actor) || isFullAdmin(actor) || can(actor, "employee_master", "create"))) notFound();
  const { t } = await getT();
  const rows = await listSections(actor);
  return (
    <>
      <PageHeader eyebrow={t("nav.admin")} title={t("sections.title")} description={t("sections.subtitle")} />
      <SectionsTable rows={rows.map((s) => ({ id: s.id, code: s.code, name: s.name, nameHi: s.nameHi ?? "", attendanceMode: s.attendanceMode, weeklyOff: s.weeklyOff ?? "", isActive: s.isActive }))} />
    </>
  );
}
