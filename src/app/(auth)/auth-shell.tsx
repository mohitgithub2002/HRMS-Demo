import { Building2, ShieldCheck, Wallet } from "lucide-react";
import { BrandWordmark } from "@/components/brand/mark";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { getT } from "@/core/i18n/server";

/**
 * The frame of every sign-in screen: a midnight panel with the promise of the product on the left (hidden on
 * phones), the form on the right.
 */
export async function AuthShell({ children, accent }: { children: React.ReactNode; accent?: string | null }) {
  const { t, locale } = await getT();
  const points = [
    { icon: Building2, en: "Every organisation in its own vault — nothing ever crosses over.", hi: "हर संगठन अपनी अलग तिजोरी में — कुछ भी इधर-उधर नहीं जाता।" },
    { icon: Wallet, en: "Payroll to the rupee: pay matrix, DA, NPS, GPF, tax and pension.", hi: "रुपये तक सटीक वेतन: वेतन मैट्रिक्स, डीए, एनपीएस, जीपीएफ, कर और पेंशन।" },
    { icon: ShieldCheck, en: "One-time codes, an audit trail that cannot be edited, Hindi and English.", hi: "एक-बार के कोड, न बदलने वाला ऑडिट ट्रेल, हिन्दी और अंग्रेज़ी।" },
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="bg-aurora relative hidden overflow-hidden p-12 text-night-ink lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full border border-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 size-[360px] rounded-full border border-gold-300/10" aria-hidden="true" />
        <BrandWordmark invert sub={t("common.appTagline")} />
        <div className="relative max-w-lg">
          <h1 className="font-display text-[2.75rem] leading-[1.08] font-medium text-white">
            {locale === "hi" ? (
              <>
                लोगों और वेतन का <span className="text-gradient-gold italic">शांत</span> घर।
              </>
            ) : (
              <>
                The <span className="text-gradient-gold italic">calm</span> home for your people and their pay.
              </>
            )}
          </h1>
          <ul className="mt-10 space-y-5">
            {points.map((p, i) => (
              <li key={i} className="flex items-start gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-gold-300 ring-1 ring-white/10">
                  <p.icon className="size-4" />
                </span>
                <span className="pt-1.5 text-[0.9375rem] leading-relaxed text-night-muted">{locale === "hi" ? p.hi : p.en}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-night-muted/70">{t("auth.secureNote")}</p>
      </aside>
      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        {accent && <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} aria-hidden="true" />}
        <div className="flex items-center justify-between">
          <BrandWordmark className="lg:invisible" sub={t("common.appTagline")} />
          <LanguageSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[25rem] animate-slide-up">{children}</div>
        </div>
      </main>
    </div>
  );
}
