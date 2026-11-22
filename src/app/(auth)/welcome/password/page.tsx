import { redirect } from "next/navigation";
import { getActor } from "@/core/auth/session";
import { getT } from "@/core/i18n/server";
import { AuthShell } from "../../auth-shell";
import { PasswordForm } from "@/components/shell/password-form";

export const metadata = { title: "Choose your password" };

/** First sign-in: the one-time password is replaced before anything else opens. */
export default async function WelcomePasswordPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!actor.mustChangePassword) redirect("/");
  const { t } = await getT();
  return (
    <AuthShell accent={actor.tenant.accentColor}>
      <h2 className="font-display text-[1.75rem] leading-tight font-medium text-ink">{t("auth.setPasswordTitle")}</h2>
      <p className="mt-2 mb-6 text-[0.9375rem] leading-relaxed text-muted">{t("auth.setPasswordIntro")}</p>
      <PasswordForm endpoint="/api/v1/me/password" then="/" />
    </AuthShell>
  );
}
