import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The title block of a screen: an optional eyebrow, a display title, a line of help and the screen's actions. */
export function PageHeader({ title, description, eyebrow, actions, breadcrumbs, className }: { title: React.ReactNode; description?: React.ReactNode; eyebrow?: React.ReactNode; actions?: React.ReactNode; breadcrumbs?: { label: string; href?: string }[]; className?: string }) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8", className)}>
      <div className="min-w-0 max-w-2xl">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {b.href ? <Link href={b.href} className="hover:text-brand-700 dark:hover:text-brand-300">{b.label}</Link> : <span className="text-ink-2">{b.label}</span>}
                {i < breadcrumbs.length - 1 && <ChevronRight className="size-3.5 text-faint" aria-hidden="true" />}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-gold-600 dark:text-gold-300">{eyebrow}</p>}
        <h1 className="font-display text-[1.75rem] leading-tight font-medium text-ink sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
