import { Inbox } from "lucide-react";
import Link from "next/link";
import type { ApprovalDetails } from "@/core/approvals/details";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { decisionBlocker, listDecidedBy, listInbox, listRaisedBy } from "@/core/approvals";
import { requireActor } from "@/core/auth/guard";
import { formatDateTime } from "@/core/dates";
import { getT } from "@/core/i18n/server";
import { tDynamic } from "@/i18n";
import { TaskActions } from "./task-actions";

export const metadata = { title: "Approvals" };

const TONE: Record<string, Tone> = { PENDING: "gold", APPROVED: "success", REJECTED: "danger", RETURNED: "warning", CANCELLED: "neutral" };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requireActor();
  const { t, locale } = await getT();
  const tab = (await searchParams).tab ?? "waiting";
  const tasks = tab === "raised" ? await listRaisedBy(actor) : tab === "decided" ? await listDecidedBy(actor) : await listInbox(actor);
  return (
    <>
      <PageHeader title={t("approvals.title")} description={t("approvals.subtitle")} />
      <LinkTabs
        active={tab}
        tabs={[
          { key: "waiting", label: t("approvals.waiting"), href: "/approvals" },
          { key: "raised", label: t("approvals.raised"), href: "/approvals?tab=raised" },
          { key: "decided", label: t("approvals.decided"), href: "/approvals?tab=decided" },
        ]}
      />
      {tasks.length === 0 ? (
        <Card>
          <EmptyState icon={<Inbox />} title={t("approvals.empty")} />
        </Card>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const details = ((task.details ?? {}) as ApprovalDetails).rows ?? [];
            const mayDecide = tab === "waiting" && decisionBlocker(actor, task) === null;
            return (
              <li key={task.id}>
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/approvals/${task.id}`} className="font-medium text-ink hover:text-brand-700 hover:underline dark:hover:text-brand-300">
                        {(locale === "hi" && task.titleHi) || task.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {t("approvals.from", { name: task.makerName })} · {formatDateTime(task.createdAt, locale)}
                      </p>
                    </div>
                    <Badge tone={TONE[task.status]} dot>
                      {tDynamic(t, `approvals.status.${task.status}`)}
                    </Badge>
                  </div>
                  {details.length > 0 && (
                    <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-xl bg-surface-2 p-4 text-sm ring-1 ring-line sm:grid-cols-2">
                      {details.slice(0, 8).map((d, i) => (
                        <div key={i} className="flex justify-between gap-3">
                          <dt className="text-muted">{(locale === "hi" && d.labelHi) || d.label}</dt>
                          <dd className="text-right text-ink">
                            {d.old !== undefined && d.old !== null && <span className="mr-2 text-faint line-through">{d.old}</span>}
                            {d.new}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {task.makerNote && <p className="mt-3 text-sm text-ink-2">“{task.makerNote}”</p>}
                  {task.decisionNote && <p className="mt-3 text-sm text-ink-2">{task.deciderName}: “{task.decisionNote}”</p>}
                  {(mayDecide || (tab === "raised" && task.status === "PENDING")) && <TaskActions id={task.id} mode={mayDecide ? "decide" : "withdraw"} />}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
