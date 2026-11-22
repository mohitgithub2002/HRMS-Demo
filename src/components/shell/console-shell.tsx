"use client";

import { Activity, Building2, LayoutDashboard, LogOut, Menu as MenuIcon, Plus, UserRound, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/mark";
import { Avatar } from "@/components/ui/avatar";
import { useT } from "@/core/i18n/client";
import type { TKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { IdleTimer } from "./idle-timer";
import { LanguageSwitch } from "./language-switch";
import { ThemeSwitch } from "./theme-switch";

const ITEMS: { href: string; label: TKey; icon: React.ComponentType<{ className?: string }>; owner?: boolean }[] = [
  { href: "/platform", label: "platform.nav.dashboard", icon: LayoutDashboard },
  { href: "/platform/orgs", label: "platform.nav.orgs", icon: Building2 },
  { href: "/platform/orgs/new", label: "platform.nav.newOrg", icon: Plus, owner: true },
  { href: "/platform/team", label: "platform.nav.team", icon: Users },
  { href: "/platform/activity", label: "platform.nav.audit", icon: Activity },
  { href: "/platform/account", label: "nav.profile", icon: UserRound },
];

function active(pathname: string, href: string) {
  if (href === "/platform") return pathname === "/platform";
  if (href === "/platform/orgs") return pathname === "/platform/orgs" || (pathname.startsWith("/platform/orgs/") && !pathname.startsWith("/platform/orgs/new"));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Side({ user, onNavigate }: { user: { name: string; role: string; owner: boolean }; onNavigate?: () => void }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col bg-night text-night-ink">
      <div className="px-5 pt-5 pb-5">
        <Link href="/platform" onClick={onNavigate} className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-tight text-white">Kosh</span>
            <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-gold-300">{t("platform.console")}</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label={t("nav.menu")}>
        {ITEMS.filter((i) => !i.owner || user.owner).map((i) => {
          const on = active(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem] font-medium transition-colors", on ? "bg-white/[0.08] text-white" : "text-night-muted hover:bg-white/[0.04] hover:text-white")}
            >
              {on && <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r-full bg-gradient-to-b from-gold-200 to-gold-500" aria-hidden="true" />}
              <i.icon className={cn("size-[1.15rem]", on ? "text-gold-300" : "")} />
              {t(i.label)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-night-line p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user.name} size="sm" className="ring-night" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-semibold text-white">{user.name}</p>
            <p className="truncate text-[0.6875rem] text-night-muted">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/platform/auth/logout", { method: "POST" });
              router.replace("/platform/login");
              router.refresh();
            }}
            className="grid size-8 place-items-center rounded-lg text-night-muted hover:bg-white/5 hover:text-white"
            aria-label={t("common.signOut")}
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <LanguageSwitch invert className="mt-2 w-full justify-center" />
      </div>
    </div>
  );
}

export function ConsoleShell({ user, children }: { user: { name: string; role: string; owner: boolean }; children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="min-h-dvh lg:pl-[16rem]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[16rem] lg:block">
        <Side user={user} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-night/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label={t("common.close")} />
          <div className="absolute inset-y-0 left-0 w-[16rem] max-w-[85vw] animate-slide-in-left">
            <Side user={user} onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} className="absolute top-4 -right-12 grid size-9 place-items-center rounded-full bg-surface shadow-raised" aria-label={t("common.close")}>
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-xl hover:bg-sunken lg:hidden" aria-label={t("nav.menu")}>
            <MenuIcon className="size-5" />
          </button>
          <span className="rounded-full bg-gold-50 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-gold-700 ring-1 ring-gold-200 dark:bg-gold-900/30 dark:text-gold-200 dark:ring-gold-800">{t("platform.console")}</span>
          <div className="flex-1" />
          <ThemeSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</main>
      <IdleTimer logoutUrl="/api/platform/auth/logout" loginUrl="/platform/login" pingUrl="/api/platform/me/ping" />
    </div>
  );
}
