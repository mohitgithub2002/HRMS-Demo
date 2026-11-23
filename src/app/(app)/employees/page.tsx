import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, ClipboardList, IdCard, LayoutGrid, Search, Upload, UserPlus } from "lucide-react";
import { NoAccess } from "@/components/no-access";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { RowLink } from "@/components/ui/row-link";
import { Table, Td, Th, THead } from "@/components/ui/table";
import { canAll, holds, scopeFor } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { formatDate, formatMonth } from "@/core/dates";
import { tDynamic } from "@/i18n";
import { getT } from "@/core/i18n/server";
import { formatINR } from "@/core/money";
import { levelsOf } from "@/modules/payroll/matrix-7cpc";
import { EMPLOYEE_TYPES } from "@/modules/employees/schema";
import { listEmployees } from "@/modules/employees/service";
import { formOptions } from "./_components/options";
import { statusTone, typeTone } from "./_components/tones";

export const metadata: Metadata = { title: "Employees" };

type SP = { q?: string; sectionId?: string; type?: string; payLevel?: string; status?: string; page?: string };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  const scope = scopeFor(actor, "employee_master", "view");
  if (scope !== "all" && scope !== "section") return <NoAccess />;
  const { t, locale } = await getT();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [data, options] = await Promise.all([
    listEmployees(actor, { q: sp.q, sectionId: sp.sectionId, type: sp.type, payLevel: sp.payLevel, status: sp.status, page }),
    formOptions(actor.db),
  ]);
  // A search that finds one person — an exact Employee ID or a name — opens their full profile straight away
  // (client add-on: search a person, see everything about them).
  if (sp.q?.trim() && data.total === 1 && data.rows.length === 1) redirect(`/employees/${data.rows[0].id}`);
  // Logins that see pay (Admin, Payroll, Checker) also see what each person was last paid.
  const showPay = canAll(actor, "payroll", "view");
  // Last net pay per person arrives with the payroll module.
  const pays = new Map<string, { month: string; net: number }>();
  const hr = canAll(actor, "employee_master", "create");
  const isChecker = holds(actor, "CHECKER") || canAll(actor, "employee_master", "check");

  return (
    <div>
      <PageHeader
        title={t("employees.title")}
        description={t("employees.subtitle")}
        actions={
          <>
            {(hr || isChecker) && (
              <LinkButton href="/employees/requests" icon={<ClipboardList className="size-4" aria-hidden="true" />}>
                {t("employees.requests")}
              </LinkButton>
            )}
            {actor.loginType !== "EMPLOYEE" && (
              <LinkButton href="/employees/posts" icon={<LayoutGrid className="size-4" aria-hidden="true" />}>
                {t("employees.posts")}
              </LinkButton>
            )}
            {hr && (
              <>
                <LinkButton href="/employees/bulk" icon={<Upload className="size-4" aria-hidden="true" />}>
                  {t("employees.bulkUpload")}
                </LinkButton>
                <LinkButton href="/employees/service-books" icon={<BookOpen className="size-4" aria-hidden="true" />}>
                  {t("employees.serviceBookScans.button")}
                </LinkButton>
                <LinkButton href="/employees/new" variant="primary" icon={<UserPlus className="size-4" aria-hidden="true" />}>
                  {t("employees.add")}
                </LinkButton>
              </>
            )}
          </>
        }
      />
      <Card>
        <form method="get" className="grid grid-cols-1 gap-3 border-b border-line px-5 py-4 sm:px-6 md:grid-cols-[minmax(14rem,1fr)_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input name="q" defaultValue={sp.q} placeholder={t("employees.searchPlaceholder")} aria-label={t("common.search")} className={controlClass(false, "h-10 pl-9")} />
          </div>
          {scope === "all" && (
            <select name="sectionId" defaultValue={sp.sectionId ?? ""} aria-label={t("common.section")} className={controlClass(false, "h-10")}>
              <option value="">{t("employees.allSections")}</option>
              {options.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {(locale === "hi" && s.nameHi) || s.name}
                </option>
              ))}
            </select>
          )}
          <select name="type" defaultValue={sp.type ?? ""} aria-label={t("common.type")} className={controlClass(false, "h-10")}>
            <option value="">{t("employees.allTypes")}</option>
            {EMPLOYEE_TYPES.map((x) => (
              <option key={x} value={x}>
                {tDynamic(t, `employees.type.${x}`)}
              </option>
            ))}
          </select>
          <select name="payLevel" defaultValue={sp.payLevel ?? ""} aria-label={t("employees.fields.payLevel")} className={controlClass(false, "h-10")}>
            <option value="">{t("employees.allLevels")}</option>
            {levelsOf(options.payMatrix).map((l) => (
              <option key={l} value={l}>
                {t("employees.level", { level: l })}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} aria-label={t("common.status")} className={controlClass(false, "h-10")}>
            <option value="">{t("employees.statusCurrent")}</option>
            <option value="DRAFT">{t("employees.status.DRAFT")}</option>
            <option value="LEFT">{t("employees.statusLeft")}</option>
            <option value="ALL">{t("employees.statusAll")}</option>
          </select>
          <button type="submit" className={buttonClass("secondary")}>
            {t("common.search")}
          </button>
        </form>
        {data.rows.length === 0 ? (
          <EmptyState icon={<IdCard className="size-6" aria-hidden="true" />} title={t("common.noData")} />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t("employees.columns.employee")}</Th>
                  <Th>{t("employees.columns.post")}</Th>
                  <Th>{t("employees.columns.type")}</Th>
                  <Th align="right">{t("employees.columns.level")}</Th>
                  <Th>{t("employees.columns.joined")}</Th>
                  <Th>{t("employees.columns.status")}</Th>
                  {showPay && <Th align="right">{t("employees.columns.lastNetPay")}</Th>}
                </tr>
              </THead>
              <tbody>
                {data.rows.map((e) => (
                  <RowLink key={e.id} href={`/employees/${e.id}`}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={e.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{locale === "hi" && e.nameHi ? e.nameHi : e.name}</p>
                          <p className="tabular text-xs text-muted">{e.employeeCode ?? "—"}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="whitespace-nowrap text-ink">{(locale === "hi" && e.post.nameHi) || e.post.name}</p>
                      <p className="whitespace-nowrap text-xs text-muted">{(locale === "hi" && e.section.nameHi) || e.section.name}</p>
                    </Td>
                    <Td>
                      <Badge tone={typeTone(e.type)}>{tDynamic(t, `employees.type.${e.type}`)}</Badge>
                    </Td>
                    <Td align="right" className="whitespace-nowrap">
                      {e.payLevel ? `${e.payLevel} · ${e.payCell}` : "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(e.dateOfJoining, locale)}</Td>
                    <Td>
                      <Badge tone={statusTone(e.status)} dot>
                        {tDynamic(t, `employees.status.${e.status}`)}
                      </Badge>
                    </Td>
                    {showPay && (
                      <Td align="right" className="whitespace-nowrap">
                        {pays.get(e.id) ? (
                          <>
                            <span className="tabular font-medium text-ink">{formatINR(pays.get(e.id)!.net)}</span>
                            <span className="block text-xs text-muted">{formatMonth(pays.get(e.id)!.month, locale)}</span>
                          </>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>
                    )}
                  </RowLink>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              baseHref="/employees"
              params={{ q: sp.q, sectionId: sp.sectionId, type: sp.type, payLevel: sp.payLevel, status: sp.status }}
              labels={{
                showing: t("common.showing", { from: (data.page - 1) * data.pageSize + 1, to: Math.min(data.page * data.pageSize, data.total), total: data.total }),
                previous: t("common.previous"),
                next: t("common.next"),
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
