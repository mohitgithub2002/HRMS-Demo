"use client";

import { useT } from "@/core/i18n/client";
import { tDynamic } from "@/i18n";
import { cn } from "@/lib/utils";

/** Weekly off days as "0,6" (0 = Sunday). `allowEmpty`: none chosen means "same as the organisation". */
export function WeekdayPicker({ label, value, onChange, allowEmpty }: { label: string; value: string; onChange: (v: string) => void; allowEmpty?: string }) {
  const t = useT();
  const chosen = new Set(value ? value.split(",") : []);
  const toggle = (d: string) => {
    const next = new Set(chosen);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    onChange([...next].sort().join(","));
  };
  return (
    <fieldset>
      <legend className="mb-1.5 text-[0.8125rem] font-medium text-ink-2">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {["1", "2", "3", "4", "5", "6", "0"].map((d) => (
          <button key={d} type="button" aria-pressed={chosen.has(d)} onClick={() => toggle(d)} className={cn("h-9 min-w-12 rounded-lg px-3 text-sm font-medium ring-1 transition", chosen.has(d) ? "bg-brand-600 text-white ring-brand-600" : "bg-surface text-ink-2 ring-line hover:ring-line-strong")}>
            {tDynamic(t, `settings.weekday.${d}`)}
          </button>
        ))}
      </div>
      {allowEmpty && chosen.size === 0 && <p className="mt-1.5 text-xs text-muted">{allowEmpty}</p>}
    </fieldset>
  );
}
