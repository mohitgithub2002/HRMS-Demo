import { ArrowUpRight, Briefcase, Landmark, Receipt, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireActor } from "@/core/auth/guard";
import { adminTools, type MenuIcon } from "@/core/auth/menu";
import { getT } from "@/core/i18n/server";

export const metadata = { title: "Administration" };

const ICONS: Partial<Record<MenuIcon, React.ComponentType<{ className?: string }>>> = { sparkles: Sparkles, landmark: Landmark, briefcase: Briefcase, receipt: Receipt, users: Users, settings: Settings, shield: ShieldCheck };

export default async function AdminPage() {
  const actor = await requireActor();
  const tools = adminTools(actor);
  if (!tools.length) notFound();
  const { t } = await getT();
  return (
    <>
      <PageHeader eyebrow={actor.tenant.code} title={t("nav.admin")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const Icon = ICONS[tool.icon] ?? Settings;
          return (
            <Link key={tool.key} href={tool.href} className="group rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card transition-[box-shadow,border-color] hover:border-brand-200 hover:shadow-raised dark:hover:border-brand-800">
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-gold-50 text-brand-700 ring-1 ring-line dark:from-brand-950/60 dark:to-gold-900/20 dark:text-brand-300">
                  <Icon className="size-[1.15rem]" />
                </span>
                <ArrowUpRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600" />
              </div>
              <p className="mt-4 font-semibold text-ink">{t(tool.label)}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t(tool.hint, { org: actor.tenant.code })}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
