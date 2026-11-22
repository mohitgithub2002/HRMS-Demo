"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Kosh mark: a faceted gem (a treasury, "kosh") in champagne gold on midnight. Pure SVG so it is crisp at every
 * size and needs no file. Gradient ids are unique per copy: a page shows the mark more than once, and a copy inside a
 * hidden element (the desktop sidebar on a phone) cannot lend its gradients to the others.
 */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const bg = `kosh-bg-${id}`;
  const gold = `kosh-gold-${id}`;
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2766" />
          <stop offset="1" stopColor="#0c0f1e" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5edda" />
          <stop offset="0.5" stopColor="#ddbe7c" />
          <stop offset="1" stopColor="#a37233" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${bg})`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="none" stroke="#ffffff" strokeOpacity="0.08" />
      <path d="M20 8.5 30.5 16 20 31.5 9.5 16Z" fill={`url(#${gold})`} />
      <path d="M9.5 16h21M20 8.5 15 16l5 15.5L25 16Z" fill="none" stroke="#0c0f1e" strokeOpacity="0.28" strokeWidth="0.9" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandWordmark({ className, sub, invert }: { className?: string; sub?: string; invert?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="leading-tight">
        <span className={cn("block font-display text-[1.2rem] font-semibold tracking-tight", invert ? "text-white" : "text-ink")}>Kosh</span>
        {sub && <span className={cn("block text-[0.6875rem] font-medium uppercase tracking-[0.14em]", invert ? "text-gold-300/90" : "text-gold-600")}>{sub}</span>}
      </span>
    </span>
  );
}
