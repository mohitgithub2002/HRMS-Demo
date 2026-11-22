"use client";

import { Languages } from "lucide-react";
import { useI18n, useSetLocale } from "@/core/i18n/client";
import { cn } from "@/lib/utils";

/** EN / हि — switches the whole screen at once. */
export function LanguageSwitch({ className, invert }: { className?: string; invert?: boolean }) {
  const { locale, t } = useI18n();
  const setLocale = useSetLocale();
  return (
    <div role="radiogroup" aria-label={t("common.language")} className={cn("inline-flex items-center gap-0.5 rounded-full p-0.5 ring-1", invert ? "bg-white/5 ring-white/15" : "bg-sunken ring-line", className)}>
      <Languages className={cn("ml-2 size-3.5", invert ? "text-night-muted" : "text-faint")} aria-hidden="true" />
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          onClick={() => locale !== l && setLocale(l)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            locale === l ? (invert ? "bg-white/15 text-white" : "bg-surface text-ink shadow-card") : invert ? "text-night-muted hover:text-white" : "text-muted hover:text-ink",
          )}
        >
          {l === "en" ? "EN" : "हि"}
        </button>
      ))}
    </div>
  );
}
