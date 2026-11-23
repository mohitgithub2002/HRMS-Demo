import type { Metadata } from "next";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/ui/page-header";
import { canAll } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { getSetting } from "@/modules/settings/store";
import { ServiceBookUploader } from "./uploader";

export const metadata: Metadata = { title: "Scanned service books" };

/** Client add-on: scanned service books of existing and older staff, many at once, matched by Employee ID. */
export default async function ServiceBooksPage() {
  const actor = await requireActor();
  if (!canAll(actor, "employee_master", "create")) return <NoAccess />;
  const { t } = await getT();
  const types = (await getSetting(actor.db, "documents")).types;
  const maxMb = types.find((x) => x.code === "SERVICE_BOOK")?.maxMb ?? 50;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader breadcrumbs={[{ label: t("employees.title"), href: "/employees" }, { label: t("employees.serviceBookScans.title") }]} title={t("employees.serviceBookScans.title")} description={t("employees.serviceBookScans.subtitle")} />
      <ServiceBookUploader maxMb={maxMb} />
    </div>
  );
}
