import Link from "next/link";
import { cn } from "@/lib/utils";

/** A figure with its label; links somewhere when `href` is given. */
export function StatTile({ label, value, hint, icon, href, tone = "brand", className }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; href?: string; tone?: "brand" | "gold" | "success" | "warning" | "danger" | "green" | "amber" | "red" | "gray" | "blue"; className?: string }) {
  const key = ({ green: "success", amber: "warning", red: "danger", gray: "brand", blue: "brand" } as Record<string, string>)[tone] ?? tone;
  const toneClass = ({
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
    gold: "bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-200",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  } as Record<string, string>)[key];
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] font-medium text-muted">{label}</p>
        {icon && <span className={cn("grid size-8 place-items-center rounded-lg [&_svg]:size-4", toneClass)}>{icon}</span>}
      </div>
      <p className="tabular mt-3 font-display text-[2rem] leading-none font-medium text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = cn("block rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card", href && "transition-[box-shadow,border-color] hover:border-brand-200 hover:shadow-raised dark:hover:border-brand-800", className);
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
