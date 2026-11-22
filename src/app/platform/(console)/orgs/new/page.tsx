import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformActor } from "@/core/auth/platform-session";
import { getT } from "@/core/i18n/server";
import { NewOrgWizard } from "./wizard";

export const metadata = { title: "New organisation" };

export default async function NewOrgPage() {
  const pa = await getPlatformActor();
  if (pa?.role !== "OWNER") notFound();
  const { t } = await getT();
  return (
    <>
      <PageHeader eyebrow={t("platform.console")} title={t("platform.create.title")} description={t("platform.create.subtitle")} />
      <NewOrgWizard />
    </>
  );
}
