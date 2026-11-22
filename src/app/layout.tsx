import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/core/i18n/client";
import { getLocale, getSimple } from "@/core/i18n/server";

export const metadata: Metadata = {
  title: { default: "Kosh — HR & Payroll Cloud", template: "%s · Kosh" },
  description: "Employee records, attendance, leave, payroll, tax and pension for every organisation, kept apart.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/mark.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d17" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Sets the theme before the first paint (no flash): the saved choice, or the device's own.
const THEME_SCRIPT = `try{var t=localStorage.getItem('kosh-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, simple, h] = await Promise.all([getLocale(), getSimple(), headers()]);
  const nonce = h.get("x-nonce") ?? undefined;
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} simple={simple}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
