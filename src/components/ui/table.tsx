import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";

/**
 * Data table. A row that opens something carries a link in its first cell (Tab, Enter). Wide tables scroll inside
 * their card; with `stack` they become one card per row on a phone.
 */
export function Table({ className, children, stack, label }: { className?: string; children: React.ReactNode; stack?: boolean; label?: string }) {
  return (
    <ScrollArea className={cn(stack && "stack-table", className)} label={label}>
      <table className="w-full border-separate border-spacing-0 text-left text-sm">{children}</table>
    </ScrollArea>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="sticky top-0 z-[1] bg-surface-2/95 backdrop-blur">{children}</thead>;
}

export function Th({ className, children, align = "left", ...rest }: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-line px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  align = "left",
  label,
  actions,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center"; label?: string; actions?: boolean }) {
  return (
    <td
      data-label={label}
      data-actions={actions ? "" : undefined}
      className={cn(
        "border-b border-line/70 px-4 py-3.5 align-middle text-ink-2 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
        align === "right" && "tabular text-right",
        align === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

export function Tr({ className, children, interactive, ...rest }: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr className={cn("transition-colors last:[&>td]:border-b-0", interactive && "hover:bg-brand-50/50 focus-within:bg-brand-50/70 dark:hover:bg-brand-950/30", className)} {...rest}>
      {children}
    </tr>
  );
}
