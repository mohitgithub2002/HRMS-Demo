/**
 * Payroll (Module 6): the rules every installation starts with — the 7th CPC pay matrix, the dated rates and the pay
 * heads — and, for the demo, standing pay items and two closed months of payroll worked out by the real engine.
 */
import type { TenantDb } from "@/core/tenancy/scoped";
import { addDays, datesOfMonth, fromISODate, shiftMonth, todayIST, weekday } from "@/core/dates";
import { computeRun, recordLoanRecoveries, RUN_GROUPS, saveRun } from "@/modules/payroll/compute";
import { incrementDatesAround, incrementMonthFor } from "@/modules/payroll/pay-rules";
import { recordGpf } from "@/modules/statutory/gpf-posting";
import { seedGpfOpenings, seedStatutoryBeforePayroll, seedStatutoryHistory } from "./seed-statutory";


/** [employee code, head, amount, from month offset (0 = two months ago), to month offset or null, note] */
const DEMO_ITEMS: [string, string, number, number, number | null, string][] = [
  ["DEMO00002", "GPF", 15000, 0, null, "GPF subscription as chosen"],
  ["DEMO00008", "GPF", 8000, 0, null, "GPF subscription as chosen"],
  ["DEMO00025", "GPF", 10000, 0, null, "GPF subscription as chosen"],
  ["DEMO00009", "LICENCE", 650, 0, null, "Type-I quarter, Sadar Bazar"],
  ["DEMO00010", "LICENCE", 520, 0, null, "Type-I quarter, Gopinath Bazar"],
  ["DEMO00005", "SOCIETY", 1000, 0, null, "Employees' Co-operative Society"],
  // A one-off recovery this month makes a net-pay change over 25% for the Checker to see (PR-10).
  ["DEMO00019", "RECOVERY", 18000, 2, 2, "Recovery of HRA paid twice in August"],
];

/**
 * Demo: standing pay items, and the last two months of payroll for every pay group, closed — so this month shows the
 * change against last month, and the run for this month is left for the user to do.
 */
export async function seedPayrollDemo(db: TenantDb, people: Map<string, string>, users: { payroll: { id: string; name: string }; checker: { id: string; name: string }; signer: { id: string; name: string } }) {
  if ((await db.payrollRun.count({ where: {} })) > 0) return;
  const today = todayIST();
  const thisMonth = today.slice(0, 7);
  const months = [shiftMonth(thisMonth, -2), shiftMonth(thisMonth, -1)];

  // PR-06: the last 1 January and 1 July increments were given on time — pay history and service book.
  const { last } = incrementDatesAround(today);
  const lastJan = `${last.slice(0, 4)}-01-01`;
  const staff = await db.employee.findMany({ where: { status: "ACTIVE", type: { in: ["PERMANENT_OPS", "PERMANENT_NPS", "DEPUTATION"] }, payCell: { gt: 1 } } });
  for (const e of staff) {
    const doj = e.dateOfJoining.toISOString().slice(0, 10);
    const due = incrementMonthFor(doj) === 1 ? lastJan : `${last.slice(0, 4)}-07-01`;
    if (due > today || doj > `${shiftMonth(due.slice(0, 7), -6)}-01`) continue;
    const entry = await db.serviceBookEntry.create({
      data: { employeeId: e.id, event: "INCREMENT", eventDate: fromISODate(due), details: `Annual increment: Level ${e.payLevel}, cell ${e.payCell! - 1} → ${e.payCell}`, detailsHi: `वार्षिक वेतन वृद्धि: लेवल ${e.payLevel}, सेल ${e.payCell! - 1} → ${e.payCell}`, data: { fromLevel: e.payLevel, fromCell: e.payCell! - 1, toLevel: e.payLevel, toCell: e.payCell }, status: "APPROVED", createdById: users.payroll.id, approvedById: users.checker.id },
    });
    await db.payHistory.create({ data: { employeeId: e.id, effectiveFrom: fromISODate(due), payLevel: e.payLevel!, payCell: e.payCell!, reason: "INCREMENT", serviceEntryId: entry.id, applied: true, createdById: users.payroll.id } });
  }

  // PR-09: two running loans, recovered through the closed months below.
  const loan = async (code: string, data: { type: "FESTIVAL" | "COMPUTER"; principal: number; interestRate: number; instalments: number; purpose: string; order: string }) => {
    const employeeId = people.get(code);
    if (!employeeId) return;
    await db.loan.create({
      data: { employeeId, type: data.type, purpose: data.purpose, principal: data.principal, interestRate: data.interestRate, instalments: data.instalments, instalmentAmount: Math.ceil(data.principal / data.instalments), sanctionDate: fromISODate(`${shiftMonth(months[0], -1)}-20`), orderNumber: data.order, startMonth: months[0], status: "RUNNING", createdById: users.payroll.id, createdByName: users.payroll.name },
    });
  };
  await loan("DEMO00012", { type: "FESTIVAL", principal: 10000, interestRate: 0, instalments: 10, purpose: "Festival advance", order: "DEMO/Accts/Adv/112" });
  await loan("DEMO00013", { type: "COMPUTER", principal: 50000, interestRate: 9.8, instalments: 25, purpose: "Laptop for site inspections", order: "DEMO/Accts/Adv/108" });
  for (const [code, headCode, amount, from, to, note] of DEMO_ITEMS) {
    const employeeId = people.get(code);
    if (!employeeId) continue;
    await db.employeePayItem.create({
      data: { employeeId, headCode, amount, fromMonth: shiftMonth(months[0], from), toMonth: to === null ? null : shiftMonth(months[0], to), note, createdById: users.payroll.id },
    });
  }
  // Module 8: declarations, salary brought from the old system and a GPF advance — before the history is worked out.
  await seedStatutoryBeforePayroll(db, people, { payroll: users.payroll, checker: users.checker }, months);
  for (const [mi, month] of months.entries()) {
    for (const group of RUN_GROUPS) {
      // Demo history ignores attendance: the seeded punches only cover last month and this month.
      const workedDays = datesOfMonth(shiftMonth(month, -1)).filter((d) => weekday(d) !== 0).length;
      const computed = await computeRun(db, group, month, { ignoreAttendance: true, assumeWorkedDays: workedDays });
      if (!computed.slips.length) continue;
      await db.$transaction(async (tx) => {
        const run = await saveRun(tx, { userId: users.payroll.id, name: users.payroll.name }, group, month, computed);
        await tx.payrollException.updateMany({ where: { runId: run.id }, data: { resolution: "EXPLAINED", note: "Checked (demo history)", resolvedById: users.payroll.id, resolvedByName: users.payroll.name, resolvedAt: new Date() } });
        const day = (d: number) => fromISODate(`${shiftMonth(month, 1)}-0${d}`);
        const payDay = new Date(`${month}-${mi === 0 ? 28 : 27}T06:30:00Z`);
        await tx.payrollRun.update({
          where: { id: run.id },
          data: {
            status: "CLOSED",
            runAt: new Date(`${month}-24T05:30:00Z`),
            submittedAt: new Date(`${month}-24T09:00:00Z`),
            checkedById: users.checker.id,
            checkedByName: users.checker.name,
            approvedById: users.signer.id,
            approvedByName: users.signer.name,
            approvedAt: new Date(`${month}-26T07:00:00Z`),
            paidAt: payDay,
            returnAt: day(2),
            closedAt: day(3),
          },
        });
        await tx.payslip.updateMany({ where: { runId: run.id, status: "INCLUDED" }, data: { creditStatus: "CREDITED", sentAt: payDay } });
        await tx.payrollRun.update({ where: { id: run.id }, data: { payslipsSentAt: payDay } });
        await recordLoanRecoveries(tx, run.id);
        await recordGpf(tx, run.id, users.payroll.id);
      });
    }
  }
  await seedGpfOpenings(db, months, users.payroll.id);
  await seedStatutoryHistory(db, months, { payroll: users.payroll, signer: users.signer });
}

const ORDER = "DEMO/EST/Resig/41";

/**
 * A resignation at the end of last month (Vikas Malhotra, DCB10012, with a running loan) whose full and final
 * settlement Payroll still has to prepare. Idempotent: made once; on a later run only puts the person back off the
 * rolls if a re-seed reset them. Returns what it did.
 */
export async function seedDemoLeaver(db: TenantDb): Promise<"added" | "kept" | "skipped"> {
  const e = await db.employee.findFirst({ where: { employeeCode: "DEMO00012" } });
  if (!e) return "skipped";
  const existing = await db.separation.findFirst({ where: { employeeId: e.id, kind: "RESIGNATION", orderNumber: ORDER } });
  if (existing) {
    if (e.status === "ACTIVE") await db.employee.update({ where: { id: e.id }, data: { status: "RESIGNED", exitDate: existing.effectiveDate, exitReason: `Resignation (order ${ORDER})` } });
    return "kept";
  }
  if (e.status !== "ACTIVE" || (await db.separation.count({ where: { employeeId: e.id } }))) return "skipped";
  const hr = await db.user.findFirst({ where: { loginType: "HR_ACCOUNTS", loginId: "HR01" } });
  if (!hr) return "skipped";
  const lastDay = addDays(`${todayIST().slice(0, 7)}-01`, -1);
  const orderDate = addDays(lastDay, -30);
  const sep = await db.separation.create({
    data: { employeeId: e.id, kind: "RESIGNATION", status: "APPROVED", effectiveDate: fromISODate(lastDay), orderNumber: ORDER, orderDate: fromISODate(orderDate), reason: "Resigned on selection to a post in the state water board; one month's notice served.", createdById: hr.id, createdByName: hr.name, approvedAt: new Date(`${orderDate}T10:00:00Z`) },
  });
  await db.employee.update({ where: { id: e.id }, data: { status: "RESIGNED", exitDate: fromISODate(lastDay), exitReason: `Resignation (order ${ORDER})` } });
  await db.serviceBookEntry.create({
    data: { employeeId: e.id, event: "EXIT", eventDate: fromISODate(lastDay), orderNumber: ORDER, orderDate: fromISODate(orderDate), details: `Resignation accepted; last day of service ${lastDay}.`, detailsHi: `त्यागपत्र स्वीकृत; सेवा का अंतिम दिन ${lastDay}।`, data: { separationId: sep.id, kind: "RESIGNATION" }, status: "APPROVED", createdById: hr.id },
  });
  return "added";
}
