import type { Prisma } from "@/generated/prisma/client";
import { fromISODate, shiftMonth } from "@/core/dates";
import { PAY_HEAD_DEFAULTS } from "@/modules/payroll/head-defaults";
import { RATE_DEFAULTS } from "@/modules/payroll/rate-catalog";
import { COMMUTATION_FACTORS_2008 } from "@/modules/pension/calculator";
import { DUE_DEFAULTS } from "@/modules/statutory/calendar";
import { fyOfMonth, TAX_DEFAULTS } from "@/modules/statutory/tax-rules";
import type { PackInstaller } from "./types";

/** Dated rates (DA, HRA, TA, NPS, GPF interest, pension rates …) and the pay heads, central rules — editable afterwards. */
export const payRulesInstaller: PackInstaller = {
  key: "pay-rules",
  module: "payroll",
  async install(tx) {
    await tx.payRate.createMany({
      data: RATE_DEFAULTS.map(([key, value, from, note]) => ({ key, value, effectiveFrom: fromISODate(from), note: note ?? "Default rate" })) as Prisma.PayRateCreateManyInput[],
    });
    await tx.payHead.createMany({
      data: PAY_HEAD_DEFAULTS.map((h, i) => ({
        code: h.code,
        name: h.name,
        nameHi: h.nameHi,
        kind: h.kind,
        calc: h.calc,
        value: h.value ?? 0,
        postCodes: h.postCodes ?? [],
        prorate: h.prorate ?? true,
        countsForDa: h.countsForDa ?? false,
        taxable: h.taxable ?? true,
        accountHead: h.accountHead,
        sortOrder: i + 1,
      })) as Prisma.PayHeadCreateManyInput[],
    });
  },
};

/** Income-tax slabs (new and old regime) for this financial year and the last — TDS is projected from them each month. */
export const taxRulesInstaller: PackInstaller = {
  key: "tax-rules",
  module: "payroll",
  async install(tx, ctx) {
    const fy = fyOfMonth(ctx.today.slice(0, 7));
    const lastFy = fyOfMonth(shiftMonth(`${fy.slice(0, 4)}-04`, -1));
    const rows: Prisma.TaxRuleCreateManyInput[] = [];
    for (const year of [lastFy, fy]) {
      for (const regime of ["NEW", "OLD"] as const) {
        const r = TAX_DEFAULTS[regime];
        rows.push({ fy: year, regime, slabs: r.slabs as unknown as Prisma.InputJsonValue, standardDeduction: r.standardDeduction, rebateIncomeLimit: r.rebateIncomeLimit, rebateMax: r.rebateMax, cessPercent: r.cessPercent } as Prisma.TaxRuleCreateManyInput);
      }
    }
    await tx.taxRule.createMany({ data: rows });
  },
};

/** The statutory due dates (TDS, 24Q, EPF, ESIC, NPS, Form 16 …) behind the calendar and its reminders. */
export const dueRulesInstaller: PackInstaller = {
  key: "due-rules",
  module: "statutory",
  async install(tx) {
    await tx.dueRule.createMany({ data: DUE_DEFAULTS.map((d) => ({ ...d })) as Prisma.DueRuleCreateManyInput[] });
  },
};

/** The commutation table (CCS (Commutation of Pension) Rules, from 2 September 2008). */
export const pensionTablesInstaller: PackInstaller = {
  key: "pension-tables",
  module: "pension",
  async install(tx) {
    await tx.ruleTable.create({
      data: { code: "COMMUTATION_FACTORS", effectiveFrom: fromISODate("2008-09-02"), data: COMMUTATION_FACTORS_2008, note: "CCS (Commutation of Pension) Rules — table from 2 September 2008" } as Prisma.RuleTableUncheckedCreateInput,
    });
  },
};
