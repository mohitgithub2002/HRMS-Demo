import type { Prisma } from "@/generated/prisma/client";
import { fromISODate } from "@/core/dates";
import { LEAVE_DEFAULTS } from "@/modules/leave/defaults";
import type { PackInstaller } from "./types";

/** The central leave rules (CL, EL, HPL, commuted, EOL, maternity, paternity, CCL, RH) — editable afterwards. */
export const leaveInstaller: PackInstaller = {
  key: "leave-rules",
  module: "leave",
  async install(tx) {
    await tx.leaveType.createMany({
      data: LEAVE_DEFAULTS.map((d, i) => ({
        code: d.code,
        name: d.name,
        nameHi: d.nameHi,
        pay: d.pay,
        creditMode: d.creditMode,
        creditDays: d.creditDays,
        cap: d.cap ?? null,
        lapsesAtYearEnd: d.lapsesAtYearEnd ?? false,
        debitFrom: d.debitFrom ?? null,
        debitFactor: d.debitFactor ?? 1,
        countsOffDays: d.countsOffDays ?? true,
        halfDayAllowed: d.halfDayAllowed ?? false,
        needsCertificate: d.needsCertificate ?? false,
        restrictedOnly: d.restrictedOnly ?? false,
        gender: d.gender ?? null,
        employeeTypes: d.employeeTypes,
        officerLimitDays: d.officerLimitDays ?? null,
        sortOrder: i + 1,
      })) as Prisma.LeaveTypeCreateManyInput[],
    });
  },
};

/** The three national holidays fixed by date, for this year and the next; the rest of the calendar is the organisation's. */
export const holidayInstaller: PackInstaller = {
  key: "national-holidays",
  module: "attendance",
  async install(tx, ctx) {
    const year = Number(ctx.today.slice(0, 4));
    const days: [string, string, string][] = [
      ["01-26", "Republic Day", "गणतंत्र दिवस"],
      ["08-15", "Independence Day", "स्वतंत्रता दिवस"],
      ["10-02", "Gandhi Jayanti", "गांधी जयंती"],
    ];
    await tx.holiday.createMany({
      data: [year, year + 1].flatMap((y) => days.map(([md, name, nameHi]) => ({ date: fromISODate(`${y}-${md}`), name, nameHi, kind: "GAZETTED" as const }))) as Prisma.HolidayCreateManyInput[],
    });
  },
};
