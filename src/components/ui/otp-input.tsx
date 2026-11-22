"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Six boxes for a one-time code. Typing, pasting or a phone's SMS autofill (which puts the whole code into the first
 * box — so no maxLength) fill them all; Backspace walks back. */
export function OtpInput({ value, onChange, disabled, invalid, label }: { value: string; onChange: (v: string) => void; disabled?: boolean; invalid?: boolean; label: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const set = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").replace(/\D/g, "").slice(0, 6));
  };
  return (
    <div className="flex justify-between gap-2" role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`${label} ${i + 1}`}
          className={cn(
            "tabular h-14 w-full min-w-0 rounded-xl border bg-surface text-center font-display text-2xl text-ink shadow-[inset_0_1px_2px_rgb(22_24_39/0.05)] transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15",
            invalid ? "border-rose-400" : "border-line",
          )}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) {
              onChange(v.slice(0, 6));
              refs.current[Math.min(5, v.length - 1)]?.focus();
              return;
            }
            set(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (v) {
              e.preventDefault();
              onChange(v);
              refs.current[Math.min(5, v.length - 1)]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
