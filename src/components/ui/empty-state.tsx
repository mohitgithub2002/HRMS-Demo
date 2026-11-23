import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon && (
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-gold-50 text-brand-600 ring-1 ring-line dark:from-brand-950/60 dark:to-gold-900/20 dark:text-brand-300 [&_svg]:size-6">
          {icon}
        </span>
      )}
      <p className="font-display text-lg font-medium text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
