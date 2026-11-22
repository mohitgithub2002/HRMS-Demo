import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Steps of a flow: done ones carry a tick, the current one is highlighted. */
export function Stepper({ steps, current, className }: { steps: React.ReactNode[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-3", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <li key={i} className="flex items-center gap-2" aria-current={on ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-semibold ring-1 transition-colors",
                done && "bg-brand-600 text-white ring-brand-600",
                on && "bg-surface text-brand-700 ring-2 ring-brand-500 dark:text-brand-300",
                !done && !on && "bg-surface text-faint ring-line-strong",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("text-sm", on ? "font-semibold text-ink" : "text-muted")}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 hidden h-px w-8 bg-line-strong sm:block" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
