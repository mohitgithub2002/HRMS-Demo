import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/core/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <EmptyState icon={<Compass />} title={t("errors.notFound")} description={t("errors.forbidden")} action={<LinkButton href="/" variant="primary">{t("nav.home")}</LinkButton>} />
    </div>
  );
}
