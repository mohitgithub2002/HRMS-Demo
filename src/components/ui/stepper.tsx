import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Steps of a flow: done ones carry a tick, the current one is highlighted. `current = steps.length` means all done.
 * `compact` (narrow cards) shows only the circles, with the current step's name under them — never a sideways scroll.
 */
export function Stepper({ steps, current, className, label, compact }: { steps: React.ReactNode[]; current: number; className?: string; label?: string; compact?: boolean }) {
  const circle = (i: number) => {
    const done = i < current;
    const on = i === current;
    return (
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 transition-colors",
          done && "bg-brand-600 text-white ring-brand-600",
          on && "bg-surface text-brand-700 ring-2 ring-brand-500 dark:text-brand-300",
          !done && !on && "bg-surface text-faint ring-line-strong",
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
      </span>
    );
  };
  if (compact) {
    return (
      <nav aria-label={label} className={className}>
        <ol className="flex items-center">
          {steps.map((s, i) => (
            <li key={i} className={cn("flex items-center", i < steps.length - 1 && "flex-1")} aria-current={i === current ? "step" : undefined}>
              {circle(i)}
              <span className="sr-only">{s}</span>
              {i < steps.length - 1 && <span className={cn("mx-1.5 h-px min-w-2 flex-1", i < current ? "bg-brand-500" : "bg-line-strong")} aria-hidden="true" />}
            </li>
          ))}
        </ol>
        {current < steps.length && (
          <p className="mt-2 text-xs font-medium text-muted" aria-hidden="true">
            {steps[current]}
          </p>
        )}
      </nav>
    );
  }
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {steps.map((s, i) => {
          const on = i === current;
          return (
            <li key={i} className="flex items-center gap-2" aria-current={on ? "step" : undefined}>
              {circle(i)}
              <span className={cn("text-sm", on ? "font-semibold text-ink" : i < current ? "text-ink-2" : "text-muted")}>{s}</span>
              {i < steps.length - 1 && <span className="mx-1 hidden h-px w-8 bg-line-strong sm:block" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
