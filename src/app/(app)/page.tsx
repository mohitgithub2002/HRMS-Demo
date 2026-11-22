import { ArrowRight, Briefcase, Inbox, Receipt, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { countInbox } from "@/core/approvals";
import { isFullAdmin } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { formatDate, todayIST } from "@/core/dates";
import { getT } from "@/core/i18n/server";
import { greetingKey } from "@/modules/home/greeting";
import { setupStatus } from "@/modules/setup/status";
import { SetupBanner } from "./admin/setup/setup-banner";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const actor = await requireActor();
  const { t, locale } = await getT();
  const admin = isFullAdmin(actor);
  const [approvals, users, sections, posts, setup] = await Promise.all([
    countInbox(actor),
    actor.db.user.count({ where: { status: "ACTIVE" } }),
    actor.db.section.count({ where: { isActive: true } }),
    actor.db.post.count({ where: { isActive: true } }),
    admin && !actor.tenant.setupDone ? setupStatus(actor) : null,
  ]);
  const firstName = actor.name.split(" ")[0];
  const orgName = (locale === "hi" && actor.tenant.nameHi) || actor.tenant.name;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-gold-600 dark:text-gold-300">{formatDate(todayIST(), locale)}</p>
        <h1 className="mt-2 font-display text-[2rem] leading-tight font-medium text-ink sm:text-[2.5rem]">{t(greetingKey(), { name: firstName })}</h1>
        <p className="mt-2 text-[0.9375rem] text-muted">{t("home.subtitle", { org: orgName })}</p>
      </header>

      {setup && <SetupBanner done={setup.done} total={setup.total} org={actor.tenant.shortName ?? actor.tenant.code} />}

      <section aria-labelledby="figures">
        <h2 id="figures" className="sr-only">{t("home.figures")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label={t("nav.approvals")} value={approvals} icon={<Inbox />} href="/approvals" tone="gold" />
          <StatTile label={t("home.users")} value={users} icon={<Users />} href={admin ? "/admin/users" : undefined} />
          <StatTile label={t("home.sections")} value={sections} icon={<Briefcase />} href={admin ? "/admin/sections" : undefined} tone="success" />
          <StatTile label={t("home.posts")} value={posts} icon={<Receipt />} href={admin ? "/admin/posts" : undefined} />
        </div>
      </section>

      <Card>
        <CardHeader title={t("home.todo")} />
        {approvals > 0 ? (
          <ul className="divide-y divide-line border-t border-line">
            <li>
              <Link href="/approvals" className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-2 sm:px-6">
                <span className="flex items-center gap-3 text-sm font-medium text-ink">
                  <span className="grid size-8 place-items-center rounded-lg bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-200">
                    <Inbox className="size-4" />
                  </span>
                  {t("home.approvalsWaiting", { n: approvals })}
                </span>
                <ArrowRight className="size-4 text-faint" />
              </Link>
            </li>
          </ul>
        ) : (
          <EmptyState title={t("home.nothingToDo")} className="py-10" />
        )}
      </Card>
    </div>
  );
}
