import Link from "next/link";
import { CalendarDays, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Attendance and leave" is one menu item (PRD §13); this switch moves between its two halves. */
export function AreaSwitch({ active, labels }: { active: "attendance" | "leave"; labels: { attendance: string; leave: string } }) {
  const item = (key: "attendance" | "leave", href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors", active === key ? "bg-surface text-brand-800 shadow-card ring-1 ring-line" : "text-muted hover:text-ink")}
    >
      {icon}
      {label}
    </Link>
  );
  return (
    <nav aria-label={`${labels.attendance} / ${labels.leave}`} className="mb-5 inline-flex gap-1 rounded-xl bg-sunken p-1">
      {item("attendance", "/attendance", <Fingerprint className="size-4" aria-hidden="true" />, labels.attendance)}
      {item("leave", "/leave/manage", <CalendarDays className="size-4" aria-hidden="true" />, labels.leave)}
    </nav>
  );
}
