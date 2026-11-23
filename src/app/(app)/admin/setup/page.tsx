import { ArrowRight, BookOpen, Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { isFullAdmin } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { getT } from "@/core/i18n/server";
import { setupStatus } from "@/modules/setup/status";
import { cn } from "@/lib/utils";
import { FinishSetup } from "./finish-setup";

export const metadata = { title: "Setup" };

export default async function SetupPage() {
  const actor = await requireActor();
  if (!isFullAdmin(actor)) notFound();
  const { t } = await getT();
  const s = await setupStatus(actor);
  const pct = Math.round((s.done / s.total) * 100);
  return (
    <>
      <PageHeader
        eyebrow={t("nav.admin")}
        title={t("setup.title", { org: actor.tenant.shortName ?? actor.tenant.code })}
        description={t("setup.subtitle")}
        actions={<FinishSetup finished={s.finished} />}
      />
      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink">{t("setup.progress", { done: s.done, total: s.total })}</p>
          <a href="/help" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
            <BookOpen className="size-4" /> {t("setup.guide")}
          </a>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-600 to-gold-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>
      <ol className="space-y-3">
        {s.steps.map((step, i) => (
          <li key={step.key}>
            <Link href={step.href} className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card transition-[box-shadow,border-color] hover:border-brand-200 hover:shadow-raised sm:p-5 dark:hover:border-brand-800">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ring-1", step.done ? "bg-emerald-500 text-white ring-emerald-500" : "bg-surface-2 text-muted ring-line-strong")}>
                {step.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold", step.done ? "text-muted" : "text-ink")}>{t(step.title)}</span>
                <span className="mt-0.5 block text-sm text-muted">{t(step.hint)}</span>
              </span>
              {step.figure !== undefined && <span className="tabular hidden font-display text-xl text-ink-2 sm:block">{step.figure}</span>}
              <ArrowRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
