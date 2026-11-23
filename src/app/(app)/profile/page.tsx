import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { PasswordForm } from "@/components/shell/password-form";
import { ThemeSwitch } from "@/components/shell/theme-switch";
import { requireActor } from "@/core/auth/guard";
import { roleOf } from "@/core/auth/roles";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const actor = await requireActor();
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("profile.title")} description={t("profile.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={actor.name} size="lg" />
              <div>
                <p className="font-display text-xl font-medium text-ink">{actor.name}</p>
                <p className="text-sm text-muted">
                  {actor.loginId} · {tDynamic(t, `role.${roleOf(actor.loginType, actor.permissions)}`)}
                </p>
                <p className="mt-1 text-xs tracking-[0.12em] text-faint">{actor.tenant.code}</p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title={t("profile.preferences")} />
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-2">{t("common.language")}</span>
                <LanguageSwitch />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-2">{t("common.theme")}</span>
                <ThemeSwitch />
              </div>
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title={t("profile.security")} />
          <CardBody>
            <PasswordForm endpoint="/api/v1/me/password" />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
