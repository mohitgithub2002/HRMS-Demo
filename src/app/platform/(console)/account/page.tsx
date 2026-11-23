import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PasswordForm } from "@/components/shell/password-form";
import { getPlatformActor } from "@/core/auth/platform-session";
import { getT } from "@/core/i18n/server";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const pa = (await getPlatformActor())!;
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("nav.profile")} description={pa.mustChangePassword ? t("auth.setPasswordIntro") : pa.email} />
      <Card className="max-w-xl">
        <CardHeader title={t("profile.security")} />
        <CardBody>
          <PasswordForm endpoint="/api/platform/me/password" then="/platform" />
        </CardBody>
      </Card>
    </>
  );
}
