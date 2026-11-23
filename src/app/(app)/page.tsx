import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarClock,
  CalendarHeart,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Fingerprint,
  HandCoins,
  History,
  Hourglass,
  IdCard,
  Inbox,
  IndianRupee,
  Landmark,
  LayoutGrid,
  Lock,
  Receipt,
  Send,
  TrendingUp,
  TriangleAlert,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { can, canAll, canManageUsers, isFullAdmin } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { roleOf } from "@/core/auth/roles";
import type { Actor } from "@/core/auth/session";
import { formatDate, formatDateTime, todayIST } from "@/core/dates";
import type { Locale } from "@/core/i18n/types";
import { getT } from "@/core/i18n/server";
import { tDynamic, type TFunction } from "@/i18n";
import { greetingKey } from "@/modules/home/greeting";
import { adminPanel, homeTiles, myWork, type Tile, type WorkItem } from "@/modules/home/service";
import { setupStatus } from "@/modules/setup/status";
import { AdminPanel } from "./_home/admin-panel";
import { SetupBanner } from "./admin/setup/setup-banner";

export const metadata = { title: "Home" };

const TILE_ICONS = { users: Users, sections: LayoutGrid, employees: IdCard, history: History, inbox: Inbox, probation: Hourglass, joining: UserPlus, attendance: Fingerprint, lock: Lock, leave: CalendarHeart, payroll: Wallet, statutory: Landmark, pension: HandCoins, certificate: BadgeCheck, cost: IndianRupee, retire: CalendarClock, alert: TriangleAlert, request: Send, increment: TrendingUp, joiners: ArrowLeftRight, migration: Database };

/** The few things each desk does most, one tap from Home (shown in the simple way of working). */
function quickActions(actor: Actor) {
  const all = [
    canAll(actor, "payroll", "create") && { key: "runPayroll", href: "/payroll", icon: Wallet },
    canAll(actor, "employee_master", "create") && { key: "addEmployee", href: "/employees/new", icon: UserPlus },
    canAll(actor, "leave", "approve") && { key: "decideLeave", href: "/leave/manage", icon: CalendarHeart },
    canAll(actor, "attendance", "create") && { key: "markAttendance", href: "/attendance", icon: Fingerprint },
    canAll(actor, "recruitment", "approve") && { key: "hire", href: "/recruitment", icon: Briefcase },
    canAll(actor, "payroll", "view") && { key: "payslips", href: "/payroll/payslips", icon: Receipt },
    canAll(actor, "arrears_loans", "create") && { key: "loans", href: "/payroll/loans", icon: HandCoins },
    canManageUsers(actor) && { key: "users", href: "/admin/users", icon: UsersRound },
    can(actor, "reports", "view") && { key: "reports", href: "/reports", icon: BarChart3 },
  ] as const;
  return all.filter((a): a is Exclude<(typeof all)[number], false> => Boolean(a)).slice(0, 6);
}

function TileGrid({ tiles, t, locale, className }: { tiles: Tile[]; t: TFunction; locale: Locale; className: string }) {
  return (
    <div className={className}>
      {tiles.map((tile) => {
        const Icon = TILE_ICONS[tile.icon as keyof typeof TILE_ICONS] ?? Inbox;
        return <StatTile key={tile.key} label={tDynamic(t, `home.${tile.key}`)} value={tile.value} href={tile.href} tone={tile.tone} hint={locale === "hi" ? (tile.hintHi ?? tile.hint) : tile.hint} icon={<Icon aria-hidden="true" />} />;
      })}
    </div>
  );
}

function WorkList({ work, t, locale }: { work: WorkItem[]; t: TFunction; locale: Locale }) {
  return (
    <ul className="divide-y divide-line border-t border-line">
      {work.map((item) => (
        <li key={item.key}>
          <Link href={item.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:px-6">
            <span className={item.tone === "red" ? "grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "grid size-9 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-200"}>
              <Clock className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-medium text-ink">{(locale === "hi" && item.titleHi) || item.title}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {item.meta && t("approvals.raisedBy", { name: item.meta })}
                {item.at && ` · ${formatDateTime(item.at, locale)}`}
              </span>
            </span>
            <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const actor = await requireActor();
  const { t, locale } = await getT();
  const admin = isFullAdmin(actor);
  const [work, tiles, panel, setup] = await Promise.all([myWork(actor), homeTiles(actor), adminPanel(actor), admin && !actor.tenant.setupDone ? setupStatus(actor) : null]);
  const firstName = actor.name.split(" ")[0];
  const orgName = (locale === "hi" && actor.tenant.nameHi) || actor.tenant.name;
  const simpleDesk = actor.simple && actor.loginType !== "EMPLOYEE";
  const quick = simpleDesk ? quickActions(actor) : [];
  const role = roleOf(actor.loginType, actor.permissions);

  // The four figures each desk looks at first; the others fold under "More figures".
  const first = role === "ACCOUNTS" ? ["approvalsWaiting", "payrollMonth", "payrollExceptions", "statutoryDue"] : role === "HR" ? ["approvalsWaiting", "leaveWaiting", "presentToday", "employeesCount"] : ["approvalsWaiting", "salaryCost", "employeesCount", "presentToday"];
  const rank = (key: string) => (first.includes(key) ? first.indexOf(key) : first.length);
  const ordered = simpleDesk ? [...tiles].sort((a, b) => rank(a.key) - rank(b.key)) : tiles;
  const top = simpleDesk ? ordered.slice(0, 4) : ordered;
  const rest = simpleDesk ? ordered.slice(4) : [];

  const workCard = (
    <Card className={simpleDesk ? "xl:col-span-2" : undefined}>
      <CardHeader
        title={t("home.myWork")}
        description={work.length ? t("home.approvalsWaitingHint") : undefined}
        icon={<Inbox aria-hidden="true" />}
        actions={
          work.length ? (
            <Link href="/approvals" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              {t("common.viewAll")}
            </Link>
          ) : undefined
        }
      />
      {work.length === 0 ? <EmptyState icon={<CheckCircle2 aria-hidden="true" />} title={t("home.myWorkEmpty")} className="py-10" /> : <WorkList work={work} t={t} locale={locale} />}
    </Card>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-gold-600 dark:text-gold-300">{formatDate(todayIST(), locale)}</p>
          <h1 className="mt-2 font-display text-[2rem] leading-tight font-medium text-ink sm:text-[2.5rem]">{t(greetingKey(), { name: firstName })}</h1>
          <p className="mt-2 text-[0.9375rem] text-muted">{t("home.subtitle", { org: orgName })}</p>
        </div>
        {simpleDesk && <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-800">{tDynamic(t, `easy.roles.${role}`)}</span>}
      </header>

      {setup && <SetupBanner done={setup.done} total={setup.total} org={actor.tenant.shortName ?? actor.tenant.code} />}

      {quick.length > 0 && (
        <nav aria-label={t("easy.home.quick")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {quick.map((a) => (
            <Link key={a.key} href={a.href} className="group flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 text-ink shadow-card ring-1 ring-line transition hover:ring-brand-300 dark:hover:ring-brand-700" data-testid={`quick-${a.key}`}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                <a.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 text-sm font-semibold leading-tight">{tDynamic(t, `easy.home.${a.key}`)}</span>
            </Link>
          ))}
        </nav>
      )}

      {simpleDesk ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {workCard}
          <section aria-labelledby="glance">
            <h2 id="glance" className="sr-only">{t("home.atAGlance")}</h2>
            <TileGrid tiles={top} t={t} locale={locale} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1" />
          </section>
        </div>
      ) : (
        <>
          {top.length > 0 && (
            <section aria-labelledby="glance">
              <h2 id="glance" className="sr-only">{t("home.atAGlance")}</h2>
              <TileGrid tiles={top} t={t} locale={locale} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" />
            </section>
          )}
          {workCard}
        </>
      )}

      {rest.length > 0 && (
        <details className="group rounded-2xl bg-surface shadow-card ring-1 ring-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[0.9375rem] font-semibold text-ink sm:px-6 [&::-webkit-details-marker]:hidden">
            {t("easy.home.more")}
            <ChevronDown className="size-4 text-faint transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-line px-5 py-5 sm:px-6">
            <TileGrid tiles={rest} t={t} locale={locale} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" />
          </div>
        </details>
      )}

      {panel && <AdminPanel panel={panel} t={t} locale={locale} />}
    </div>
  );
}
