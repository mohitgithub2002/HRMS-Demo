import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { NoAccess } from "@/components/no-access";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RowLink } from "@/components/ui/row-link";
import { Table, Td, Th, THead } from "@/components/ui/table";
import { canAll } from "@/core/auth/access";
import { requireActor } from "@/core/auth/guard";
import { formatMonth, todayIST } from "@/core/dates";
import { tDynamic } from "@/i18n";
import { getT } from "@/core/i18n/server";
import { formatINR } from "@/core/money";
import { cn } from "@/lib/utils";
import { fullName } from "@/modules/employees/present";
import { listLoans } from "@/modules/payroll/loans";
import { PayrollTabs } from "../_components/payroll-tabs";
import { LoanForm } from "./loan-form";
import { LOAN_TONE } from "./tones";

export const metadata: Metadata = { title: "Loans" };

const FILTERS = ["RUNNING", "PENDING", "CLOSED", "ALL"] as const;

/** S-43: loans and advances — sanction, schedule and recovery (PR-09). */
export default async function LoansPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requireActor();
  if (!canAll(actor, "arrears_loans", "view")) return <NoAccess />;
  const { t, locale } = await getT();
  const sp = await searchParams;
  const status = (FILTERS as readonly string[]).includes(sp.status ?? "") ? sp.status! : "RUNNING";
  const [loans, employees] = await Promise.all([
    listLoans(actor, { status }),
    canAll(actor, "arrears_loans", "create") ? actor.db.employee.findMany({ where: { status: "ACTIVE" }, select: { id: true, employeeCode: true, firstName: true, middleName: true, lastName: true, nameHi: true }, orderBy: { employeeCode: "asc" } }) : [],
  ]);

  return (
    <div>
      <PageHeader title={t("payroll.title")} description={t("payroll.loans.subtitle")} />
      <PayrollTabs active="loans" principal={actor} t={t} />
      {canAll(actor, "arrears_loans", "create") && <LoanForm employees={employees.filter((e) => e.id !== actor.employeeId).map((e) => ({ id: e.id, label: `${e.employeeCode} · ${locale === "hi" && e.nameHi ? e.nameHi : fullName(e)}` }))} startMonth={todayIST().slice(0, 7)} />}
      <Card className="mt-5">
        <CardHeader
          title={t("payroll.loans.list")}
          icon={<Landmark className="size-4.5" aria-hidden="true" />}
          actions={
            <div className="flex gap-1 rounded-xl bg-sunken p-1" role="group">
              {FILTERS.map((f) => (
                <Link key={f} href={`/payroll/loans?status=${f}`} aria-current={status === f ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", status === f ? "bg-surface text-brand-800 shadow-card" : "text-muted hover:text-ink")}>
                  {tDynamic(t, `payroll.loans.filter.${f}`)}
                </Link>
              ))}
            </div>
          }
        />
        {loans.length === 0 ? (
          <CardBody>
            <p className="text-sm text-muted">{t("payroll.loans.none")}</p>
          </CardBody>
        ) : (
          <Table stack>
            <THead>
              <tr>
                <Th>{t("payroll.columns.employee")}</Th>
                <Th>{t("payroll.loans.type")}</Th>
                <Th align="right">{t("payroll.loans.amount")}</Th>
                <Th align="right">{t("payroll.loans.instalment")}</Th>
                <Th align="right">{t("payroll.loans.principalLeft")}</Th>
                <Th>{t("payroll.columns.status")}</Th>
              </tr>
            </THead>
            <tbody>
              {loans.map((l) => (
                <RowLink key={l.id} href={`/payroll/loans/${l.id}`}>
                  <Td>
                    <Link href={`/payroll/loans/${l.id}`} className="font-medium text-ink hover:text-brand-700">
                      {locale === "hi" && l.nameHi ? l.nameHi : l.name}
                    </Link>
                    <span className="block text-xs text-muted">{l.code}</span>
                  </Td>
                  <Td label={t("payroll.loans.type")}>
                    {tDynamic(t, `payroll.loans.types.${l.type}`)}
                    <span className="block text-xs text-muted">{l.interestRate ? t("payroll.loans.rate", { rate: l.interestRate }) : t("payroll.loans.noInterest")}</span>
                  </Td>
                  <Td label={t("payroll.loans.amount")} align="right">
                    {formatINR(l.principal)}
                  </Td>
                  <Td label={t("payroll.loans.instalment")} align="right">
                    {formatINR(l.instalmentAmount)}
                    <span className="block text-xs text-muted">{t("payroll.loans.from", { month: formatMonth(l.startMonth, locale) })}</span>
                  </Td>
                  <Td label={t("payroll.loans.principalLeft")} align="right" className="font-semibold text-ink">
                    {formatINR(l.principalLeft)}
                    {l.interestLeft > 0 && <span className="block text-xs font-normal text-muted">+ {t("payroll.loans.interest")} {formatINR(l.interestLeft)}</span>}
                  </Td>
                  <Td label={t("payroll.columns.status")}>
                    <Badge tone={LOAN_TONE[l.status]}>{tDynamic(t, `payroll.loans.status.${l.status}`)}</Badge>
                  </Td>
                </RowLink>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
