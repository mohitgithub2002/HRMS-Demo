"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Home,
  Inbox,
  Landmark,
  LogOut,
  Menu as MenuIcon,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/mark";
import { Avatar } from "@/components/ui/avatar";
import type { MenuIcon as IconName, MenuItem } from "@/core/auth/menu";
import { useT } from "@/core/i18n/client";
import { cn } from "@/lib/utils";
import { IdleTimer } from "./idle-timer";
import { LanguageSwitch } from "./language-switch";
import { ThemeSwitch } from "./theme-switch";

const ICONS: Record<IconName, React.ComponentType<{ className?: string }>> = {
  home: Home,
  inbox: Inbox,
  users: Users,
  briefcase: Briefcase,
  calendar: CalendarDays,
  wallet: Wallet,
  landmark: Landmark,
  receipt: Receipt,
  chart: BarChart3,
  settings: Settings,
  sparkles: Sparkles,
  user: UserRound,
  shield: ShieldCheck,
};

export interface ShellProps {
  items: MenuItem[];
  counts: { approvals: number };
  user: { name: string; role: string };
  org: { name: string; code: string; accent: string | null };
  children: React.ReactNode;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ items, counts, onNavigate }: { items: MenuItem[]; counts: ShellProps["counts"]; onNavigate?: () => void }) {
  const t = useT();
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const on = isActive(pathname, item.href);
        const badge = item.badge === "approvals" ? counts.approvals : 0;
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem] font-medium transition-colors",
                on ? "bg-white/[0.08] text-white" : "text-night-muted hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {on && <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r-full bg-gradient-to-b from-gold-200 to-gold-500" aria-hidden="true" />}
              <Icon className={cn("size-[1.15rem] shrink-0", on ? "text-gold-300" : "text-night-muted group-hover:text-white")} />
              <span className="flex-1 truncate">{t(item.label)}</span>
              {badge > 0 && <span className="tabular min-w-5 rounded-full bg-gold-400 px-1.5 text-center text-[0.6875rem] font-semibold text-night">{badge > 99 ? "99+" : badge}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Sidebar({ items, counts, user, org, onNavigate }: Omit<ShellProps, "children"> & { onNavigate?: () => void }) {
  const t = useT();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col bg-night text-night-ink">
      <div className="px-5 pt-5 pb-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="font-display text-lg font-semibold tracking-tight text-white">Kosh</span>
        </Link>
        <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
          <span className="size-2 shrink-0 rounded-full" style={{ background: org.accent ?? "var(--color-gold-400)" }} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-[0.8125rem] font-semibold text-white">{org.name}</span>
            <span className="block text-[0.6875rem] tracking-[0.12em] text-night-muted">{org.code}</span>
          </span>
        </div>
      </div>
      <nav aria-label={t("nav.menu")} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2">
        <NavList items={items} counts={counts} onNavigate={onNavigate} />
      </nav>
      <div className="border-t border-night-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} size="sm" className="ring-night" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-semibold text-white">{user.name}</p>
            <p className="truncate text-[0.6875rem] text-night-muted">{user.role}</p>
          </div>
          <form action="/api/v1/auth/logout" method="post" onSubmit={async (e) => {
            e.preventDefault();
            await fetch("/api/v1/auth/logout", { method: "POST" });
            router.replace("/login");
            router.refresh();
          }}>
            <button type="submit" className="grid size-8 place-items-center rounded-lg text-night-muted hover:bg-white/5 hover:text-white" aria-label={t("common.signOut")} title={t("common.signOut")}>
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
        <LanguageSwitch invert className="mt-2 w-full justify-center" />
      </div>
    </div>
  );
}

export function AppShell(props: ShellProps) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the phone drawer on navigation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:pl-[17rem]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-raised">
        {t("nav.skipToContent")}
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] lg:block">
        <Sidebar {...props} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.menu")}>
          <button className="absolute inset-0 animate-fade-in bg-night/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label={t("common.close")} />
          <div className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] animate-slide-in-left shadow-overlay">
            <Sidebar {...props} onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} className="absolute top-4 -right-12 grid size-9 place-items-center rounded-full bg-surface text-ink shadow-raised" aria-label={t("common.close")}>
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-sunken lg:hidden" aria-label={t("nav.menu")}>
            <MenuIcon className="size-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <BrandMark className="size-7" />
            <span className="max-w-[40vw] truncate text-sm font-semibold text-ink">{props.org.code}</span>
          </Link>
          <div className="flex-1" />
          {props.counts.approvals > 0 && (
            <Link href="/approvals" className="relative grid size-9 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink" aria-label={`${t("nav.approvals")} (${props.counts.approvals})`}>
              <Inbox className="size-[1.1rem]" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-gold-500 ring-2 ring-canvas" />
            </Link>
          )}
          <ThemeSwitch />
          <Link href="/profile" className="hidden items-center gap-2 rounded-xl py-1 pr-2 pl-1 hover:bg-sunken sm:flex" aria-label={t("nav.profile")}>
            <Avatar name={props.user.name} size="sm" />
            <span className="max-w-40 truncate text-sm font-medium text-ink-2">{props.user.name}</span>
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {props.children}
      </main>
      <IdleTimer />
    </div>
  );
}
