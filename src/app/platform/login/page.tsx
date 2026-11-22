import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandWordmark } from "@/components/brand/mark";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { getPlatformActor } from "@/core/auth/platform-session";
import { getT } from "@/core/i18n/server";
import { PlatformLoginForm } from "./platform-login-form";

export const metadata = { title: "Platform sign-in" };

export default async function PlatformLoginPage() {
  if (await getPlatformActor()) redirect("/platform");
  const { t } = await getT();
  return (
    <div className="bg-aurora relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="absolute top-6 right-6">
        <LanguageSwitch invert />
      </div>
      <div className="w-full max-w-[26rem] animate-slide-up">
        <BrandWordmark invert sub={t("platform.console")} className="mb-8 justify-center" />
        <div className="rounded-3xl border border-white/10 bg-surface p-7 shadow-overlay sm:p-8">
          <h1 className="font-display text-[1.75rem] leading-tight font-medium text-ink">{t("platform.signInTitle")}</h1>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-muted">{t("platform.signInSubtitle")}</p>
          <PlatformLoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-night-muted">
          <Link href="/login" className="hover:text-white">{t("platform.orgSignIn")} →</Link>
        </p>
      </div>
    </div>
  );
}
