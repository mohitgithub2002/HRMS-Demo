import { cn } from "@/lib/utils";

export function Card({ className, children, as: As = "section", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <As className={cn("rounded-[var(--radius-card)] border border-line bg-surface shadow-card", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, description, actions, icon, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 [&_svg]:size-[1.15rem]">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-2 rounded-b-[var(--radius-card)] border-t border-line bg-surface-2 px-5 py-3.5 sm:px-6", className)}>{children}</div>;
}

/** Label / value pairs, e.g. on a profile tab. */
export function DescriptionList({ items, columns = 2 }: { items: { label: React.ReactNode; value: React.ReactNode }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-5", columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "")}>
      {items.map((item, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">{item.label}</dt>
          <dd className="mt-1 break-words text-[0.9375rem] text-ink">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
