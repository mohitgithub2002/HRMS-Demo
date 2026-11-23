/**
 * Statutory and tax (Module 8): the rules every installation starts with — income-tax slabs for this year and last, and
 * the statutory due dates — and, for the demo, the organisation's portal identities, GPF balances brought from the old system,
 * a GPF advance and a few tax declarations.
 */
import { storeBytes } from "@/core/storage";
import type { Prisma } from "@/generated/prisma/client";
import type { TenantDb } from "@/core/tenancy/scoped";
import { formatINR } from "@/core/money";
import { fromISODate, shiftMonth } from "@/core/dates";
import { gpfInstalment, monthsOfFy } from "@/modules/statutory/gpf-rules";
import { buildStatFile, STAT_KINDS, SUM_LABEL } from "@/modules/statutory/stat-build";
import { EMPTY_ITEMS, fyOfMonth, TAX_DEFAULTS, taxWorking, type DeclaredItems } from "@/modules/statutory/tax-rules";
import { addParts, headFlags, monthsStillToCome, partsOf, ZERO_PARTS } from "@/modules/statutory/tds-projection";
import { computeRun, RUN_GROUPS } from "@/modules/payroll/compute";
import type { PayLine } from "@/modules/payroll/engine";


type Who = { id: string; name: string };

/** [employee code, regime, items, status] — declarations for the year, made before the demo pay history. */
const DECLARATIONS: [string, "NEW" | "OLD", Partial<DeclaredItems>, "SUBMITTED" | "VERIFIED"][] = [
  ["DEMO00001", "OLD", { sec80C: 150000, sec80D: 25000, homeLoanInterest: 200000 }, "VERIFIED"],
  ["DEMO00013", "NEW", {}, "VERIFIED"],
  ["DEMO00016", "OLD", { sec80C: 120000, sec80D: 18000, rentPaid: 216000 }, "VERIFIED"],
  ["DEMO00017", "OLD", { sec80C: 150000, sec80D: 50000, sec80CCD1B: 50000, rentPaid: 300000 }, "SUBMITTED"],
];

/**
 * Before the demo pay history: the organisation's statutory identities, tax declarations (one waiting for a Checker), and a
 * GPF advance drawn in the first history month, so the history recovers its instalments.
 */
export async function seedStatutoryBeforePayroll(db: TenantDb, people: Map<string, string>, users: { payroll: Who; checker: Who }, months: string[]) {
  if (!(await db.setting.findFirst({ where: { key: "statutory" } }))) {
    const org = await db.$transaction(async (tx) => (await import("@/core/tenancy/tenant")).orgOf(tx));
    await db.setting.create({
      data: {
        key: "statutory",
        value: {
          deductorName: org.name.slice(0, 75),
          address: [org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ").slice(0, 200),
          tan: "DELC01234E",
          pan: "AAALC0123K",
          responsibleName: "Anil Sharma",
          responsibleDesignation: "Chief Executive Officer",
          ddoCode: "DDO-0123",
          ddoRegNo: "SGV012345C",
          epfCode: "DLCPM0012345000",
          esicCode: "11000123450001001",
          metroHra: true,
          professionalTax: false,
          ptSlabs: [
            { upTo: 7500, amount: 0 },
            { upTo: 10000, amount: 175 },
            { upTo: null, amount: 200 },
          ],
        },
        updatedBy: users.payroll.id,
      } as Prisma.SettingUncheckedCreateInput,
    });
  }

  const fy = fyOfMonth(months[0]);
  for (const [code, regime, items, status] of DECLARATIONS) {
    const employeeId = people.get(code);
    if (!employeeId) continue;
    const e = await db.employee.findUniqueOrThrow({ where: { id: employeeId } });
    const full = { ...EMPTY_ITEMS, ...items };
    const submittedAt = new Date(`${fy.slice(0, 4)}-04-20T06:00:00Z`);
    const decl = await db.taxDeclaration.create({
      data: {
        employeeId,
        fy,
        regime,
        items: full,
        status,
        submittedAt,
        ...(status === "VERIFIED" ? { verifiedById: users.checker.id, verifiedAt: new Date(`${fy.slice(0, 4)}-05-05T06:00:00Z`) } : {}),
      },
    });
    if (status === "SUBMITTED") {
      const name = [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ");
      // Entered by HR & Accounts from the employee's paper form (Form 12BB).
      const maker = users.payroll;
      await db.approvalTask.create({
        data: {
          kind: "tax.declaration",
          title: `Tax declaration ${fy}: ${name} (${code}) — old regime`,
          titleHi: `कर घोषणा ${fy}: ${e.nameHi ?? name} (${code}) — पुरानी व्यवस्था`,
          details: {
            summary: "Check the amounts against the proofs. Verified amounts count for TDS from January.",
            summaryHi: "राशियाँ प्रमाणों से मिलाएँ। सत्यापित राशियाँ जनवरी से टीडीएस में गिनी जाती हैं।",
            link: `/statutory/declarations/${employeeId}`,
            rows: [
              { label: "Regime", labelHi: "व्यवस्था", new: "Old regime" },
              { label: "80C", new: formatINR(full.sec80C) },
              { label: "80D", new: formatINR(full.sec80D) },
              { label: "80CCD(1B)", new: formatINR(full.sec80CCD1B) },
              { label: "Rent paid in the year", labelHi: "वर्ष में दिया किराया", new: formatINR(full.rentPaid) },
            ],
          },
          payload: { declarationId: decl.id },
          requiredPermission: "CHECKER",
          subjectEmployeeId: employeeId,
          entityType: "TaxDeclaration",
          entityId: decl.id,
          makerId: maker.id,
          makerName: maker.name,
          makerNote: "Entered from the paper Form 12BB",
        },
      });
    }
  }

  // Salary and TDS of the year before the demo history, as the old system hands them over at cut-over (§15).
  const fyStart = monthsOfFy(fy)[0];
  const before = monthsOfFy(fy).filter((m) => m < months[0]).length;
  if (before > 0) {
    const codeOf = new Map([...people].map(([code, id]) => [id, code]));
    const declared = new Map(DECLARATIONS.map((d) => [d[0], d]));
    const flags = headFlags(await db.payHead.findMany({ where: {} }));
    const ends = new Map((await db.employee.findMany({ where: {}, select: { id: true, type: true, dateOfRetirement: true, contractEnd: true } })).map((e) => [e.id, (["CONTRACT", "DAILY_WAGE", "REEMPLOYED"].includes(e.type) ? e.contractEnd : e.dateOfRetirement)?.toISOString().slice(0, 10) ?? null]));
    const workedDays = 26;
    for (const group of RUN_GROUPS) {
      const computed = await computeRun(db, group, months[0], { ignoreAttendance: true, assumeWorkedDays: workedDays });
      for (const slip of computed.slips) {
        const parts = partsOf(slip.lines, flags);
        if (parts.gross <= 0) continue;
        const d = declared.get(codeOf.get(slip.employeeId) ?? "");
        const regime = d?.[1] ?? "NEW";
        // The year's tax on the months the person is on the rolls, spread evenly over them.
        const onRolls = before + 1 + monthsStillToCome(months[0], fy, ends.get(slip.employeeId) ?? null);
        const yearTax = (taxWorking(addParts(ZERO_PARTS, parts, onRolls), regime, { ...EMPTY_ITEMS, ...(d?.[2] ?? {}) }, TAX_DEFAULTS[regime]).total * before) / onRolls;
        await db.taxCarryIn.create({
          data: { employeeId: slip.employeeId, fy, salary: Math.round(parts.gross * before), tds: Math.round(yearTax), note: `Salary and TDS ${fyStart} to ${shiftMonth(months[0], -1)} brought from the old system`, createdById: users.payroll.id },
        });
      }
    }
  }

  // A GPF advance for Rajesh Kumar, drawn in the first history month and recovered from the next.
  const rajesh = people.get("DEMO00008");
  if (rajesh) {
    const amount = 60000;
    const instalments = 24;
    const advance = await db.gpfAdvance.create({
      data: {
        employeeId: rajesh,
        kind: "ADVANCE",
        purpose: "Daughter's higher education (demo)",
        amount,
        instalments,
        instalmentAmount: gpfInstalment(amount, instalments),
        sanctionDate: fromISODate(`${months[0]}-10`),
        orderNumber: "DEMO/Accts/GPF/41",
        startMonth: months[1],
        status: "RUNNING",
        createdById: users.payroll.id,
        createdByName: users.payroll.name,
      },
    });
    await db.gpfEntry.create({ data: { employeeId: rajesh, month: months[0], fy: fyOfMonth(months[0]), kind: "ADVANCE", amount: -amount, advanceId: advance.id, note: "Advance DEMO/Accts/GPF/41", createdById: users.payroll.id } });
  }
}

/**
 * After the demo pay history: each GPF account gets its balance brought from the old system at the start of the year,
 * and the subscriptions of the months before the history (at the first history month's amount).
 */
export async function seedGpfOpenings(db: TenantDb, months: string[], createdById: string) {
  const fy = fyOfMonth(months[0]);
  const fyStart = monthsOfFy(fy)[0];
  const slips = await db.payslip.findMany({ where: { month: months[0], run: { kind: "REGULAR" } }, include: { employee: { select: { id: true, dateOfJoining: true } } } });
  const rows: Prisma.GpfEntryCreateManyInput[] = [];
  for (const s of slips) {
    const gpf = (s.lines as unknown as PayLine[]).find((l) => l.code === "GPF")?.amount ?? 0;
    if (gpf <= 0) continue;
    const years = Math.min(25, Math.max(1, Number(fy.slice(0, 4)) - s.employee.dateOfJoining.getUTCFullYear()));
    const opening = Math.round((gpf * 12 * years * 1.4) / 1000) * 1000;
    rows.push({ employeeId: s.employeeId, month: fyStart, fy, kind: "OPENING", amount: opening, note: "Balance on 1 April brought from the old system", createdById });
    for (let m = fyStart; m < months[0]; m = shiftMonth(m, 1)) {
      rows.push({ employeeId: s.employeeId, month: m, fy, kind: "SUBSCRIPTION", amount: gpf, note: "Subscription brought from the old system", createdById });
    }
  }
  if (rows.length) await db.gpfEntry.createMany({ data: rows });
}


/**
 * After the demo pay history, the office has done its filings for those months, as it would have: the TDS of each month
 * deposited by challan on the 5th, and the NPS, ECR, ESIC and pension fund files made and released by an Admin.
 */
export async function seedStatutoryHistory(db: TenantDb, months: string[], users: { payroll: Who; signer: Who }) {
  let serial = 41;
  for (const month of months) {
    const slips = await db.payslip.findMany({ where: { month, status: "INCLUDED", run: { status: { in: ["APPROVED", "PAID", "CLOSED"] } } }, select: { lines: true } });
    const tds = slips.reduce((s, x) => s + (x.lines as unknown as PayLine[]).filter((l) => l.code === "IT").reduce((a, l) => a + l.amount, 0), 0);
    const next = shiftMonth(month, 1);
    if (tds > 0) {
      const cess = Math.round((tds * 4) / 104);
      await db.tdsChallan.create({ data: { fy: fyOfMonth(month), month, bsrCode: "0510308", challanNo: String(serial++).padStart(5, "0"), depositedOn: fromISODate(`${next}-05`), tax: tds - cess, cess, interest: 0, createdById: users.payroll.id } });
    }
    for (const kind of STAT_KINDS) {
      const b = await buildStatFile(db, kind, month);
      if (!b.ready || !b.rows.length) continue;
      const stored = await storeBytes(db, Buffer.from(b.text, "utf8"), b.ext as "csv" | "txt");
      const day = kind === "stat.pension" ? `${month}-28` : `${next}-0${kind === "stat.nps" ? 4 : 9}`;
      await db.fileRecord.create({
        data: {
          direction: "OUTGOING",
          kind,
          period: month,
          fileName: b.fileName,
          mimeType: b.mime,
          size: stored.size,
          sha256: stored.sha256,
          storageKey: stored.key,
          status: "DOWNLOADED",
          meta: JSON.parse(JSON.stringify({ preview: { columns: b.columns, rows: b.rows.slice(0, 50), totalRows: b.rows.length, totals: Object.fromEntries(b.sums.map(([k, v]) => [SUM_LABEL[k], formatINR(v)])) }, link: `/statutory/files?month=${month}` })),
          createdById: users.payroll.id,
          createdByName: users.payroll.name,
          approvedById: users.signer.id,
          approvedAt: new Date(`${day}T06:00:00Z`),
          downloadCount: 1,
          lastDownloadAt: new Date(`${day}T07:00:00Z`),
          createdAt: new Date(`${day}T05:00:00Z`),
        },
      });
    }
  }
}
