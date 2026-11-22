import Link from "next/link";
import { cn } from "@/lib/utils";

/** Tabs that are links (each tab is its own address, so Back works and a tab can be shared). */
export function LinkTabs({ tabs, active, className }: { tabs: { key: string; label: React.ReactNode; href: string; count?: number }[]; active: string; className?: string }) {
  return (
    <nav className={cn("scrollbar-thin -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1", className)}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              on ? "border-brand-600 text-ink dark:border-brand-400" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="tabular rounded-full bg-sunken px-1.5 text-[0.6875rem] text-ink-2">{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
