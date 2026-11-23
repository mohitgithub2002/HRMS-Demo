import { Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/core/i18n/server";

export async function NoAccess() {
  const { t } = await getT();
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState icon={<Lock />} title={t("errors.forbidden")} action={<LinkButton href="/">{t("nav.home")}</LinkButton>} />
    </Card>
  );
}
