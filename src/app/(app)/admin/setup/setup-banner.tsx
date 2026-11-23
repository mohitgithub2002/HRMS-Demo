import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { getT } from "@/core/i18n/server";

/** On the Admin's Home until setup is finished: progress ring + a way into the checklist. */
export async function SetupBanner({ done, total, org }: { done: number; total: number; org: string }) {
  const { t } = await getT();
  const pct = Math.round((done / total) * 100);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <Link href="/admin/setup" className="bg-aurora group relative flex items-center gap-5 overflow-hidden rounded-[var(--radius-card)] p-5 text-night-ink shadow-raised sm:p-6">
      <span className="relative grid size-16 shrink-0 place-items-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="5" />
          <circle cx="28" cy="28" r={r} fill="none" stroke="url(#gold-ring)" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} />
          <defs>
            <linearGradient id="gold-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f5edda" />
              <stop offset="1" stopColor="#c08e3e" />
            </linearGradient>
          </defs>
        </svg>
        <span className="tabular text-sm font-semibold text-white">{pct}%</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-display text-xl font-medium text-white">
          <Sparkles className="size-4 text-gold-300" /> {t("setup.banner", { org })}
        </span>
        <span className="mt-1 block text-sm text-night-muted">{t("setup.bannerHint", { done, total })}</span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-gold-300 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
