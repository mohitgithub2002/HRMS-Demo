import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { canManageUsers, isFullAdmin } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { getTenantProfile } from "@/core/tenancy/tenant";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Organisation" };

export default async function OrganisationPage() {
  const actor = await requireActor();
  if (!(canManageUsers(actor) || isFullAdmin(actor))) notFound();
  const { t } = await getT();
  const p = await getTenantProfile(actor.tenantId);
  return (
    <>
      <PageHeader eyebrow={t("nav.admin")} title={t("org.title")} description={t("org.subtitle")} />
      <ProfileForm initial={{ code: p.code, name: p.name, nameHi: p.nameHi ?? "", shortName: p.shortName ?? "", address: p.address ?? "", city: p.city ?? "", state: p.state ?? "", pincode: p.pincode ?? "", accentColor: p.accentColor ?? "" }} />
    </>
  );
}
