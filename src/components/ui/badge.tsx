import { cn } from "@/lib/utils";

type BaseTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "gold" | "violet";
/** Older tone names, kept so screens can say what they mean in either vocabulary. */
type ToneAlias = "gray" | "green" | "amber" | "red" | "blue";
export type Tone = BaseTone | ToneAlias;
const ALIAS: Record<ToneAlias, BaseTone> = { gray: "neutral", green: "success", amber: "warning", red: "danger", blue: "info" };

const tones: Record<BaseTone, string> = {
  neutral: "bg-sunken text-ink-2 ring-line-strong/60",
  brand: "bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-200 dark:ring-brand-800",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
  warning: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  danger: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
  info: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
  gold: "bg-gold-50 text-gold-800 ring-gold-200 dark:bg-gold-900/30 dark:text-gold-200 dark:ring-gold-800",
  violet: "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
};

const dots: Record<BaseTone, string> = {
  neutral: "bg-faint",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  gold: "bg-gold-500",
  violet: "bg-violet-500",
};

export function Badge({ tone: raw = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  const tone: BaseTone = raw in ALIAS ? ALIAS[raw as ToneAlias] : (raw as BaseTone);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
