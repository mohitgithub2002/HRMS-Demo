/**
 * Seed: the first platform owner, and — outside production — two demo organisations created through exactly the
 * same provisioning path as the console, each with its own demo logins. Safe to run twice.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import type { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/core/password";
import { disconnectRaw, rawDb } from "@/core/tenancy/raw";
import { tenantDb, type TenantDb } from "@/core/tenancy/scoped";
import { provisionTenant } from "@/platform/provision";
import { DEMO_PASSWORD, DEMO_TENANTS } from "./seed-demo";
import { DEMO_STAFF, SMC_STAFF, seedEmployees } from "./seed-employees";
import { DEMO_DEVICE, seedAttendance } from "./seed-attendance";
import { syncDevices } from "@/core/tenancy/devices";
import { fromISODate, shiftMonth, todayIST } from "@/core/dates";
import { nextNumber } from "@/core/sequence";
import { seal } from "@/core/crypto";
import { seedDemoLeaver, seedPayrollDemo } from "./seed-payroll";
import { seedPensionDemo } from "./seed-pension";
import { installersFor } from "@/platform/packs";

async function seedOwner() {
  const email = (process.env.PLATFORM_OWNER_EMAIL ?? "owner@kosh.local").toLowerCase();
  const password = process.env.PLATFORM_OWNER_PASSWORD ?? DEMO_PASSWORD;
  const existing = await rawDb().platformUser.findUnique({ where: { email } });
  if (existing) return existing;
  const isProd = process.env.APP_ENV === "production";
  return rawDb().platformUser.create({
    data: { email, name: "Platform Owner", role: "OWNER", passwordHash: await hashPassword(password), mustChangePassword: isProd },
  });
}

async function seedTenant(demo: (typeof DEMO_TENANTS)[number], ownerId: string) {
  const existing = await rawDb().tenant.findUnique({ where: { code: demo.code } });
  if (existing) return { tenant: existing, created: false };
  const { tenant } = await provisionTenant({ ...demo.org, code: demo.code, adminPassword: DEMO_PASSWORD }, { userId: ownerId, name: "Seed" });
  const db = tenantDb(tenant.id);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db.$transaction(async (tx) => {
    for (const u of demo.users) {
      await tx.user.create({ data: { ...u, passwordHash, mustChangePassword: false } as Prisma.UserUncheckedCreateInput });
    }
  });
  return { tenant, created: true };
}

/**
 * Pack parts added to Kosh after a demo organisation was made (leave rules, holidays, the pay matrix) are installed
 * once, part by part, when their table is still empty — so an old development database catches up.
 */
async function topUpPack(tenantId: string, modules: string[]) {
  const db = tenantDb(tenantId);
  const empty: Record<string, () => Promise<boolean>> = {
    "pay-matrix": async () => (await db.payMatrix.count()) === 0,
    "leave-rules": async () => (await db.leaveType.count()) === 0,
    "national-holidays": async () => (await db.holiday.count()) === 0,
    "pay-rules": async () => (await db.payHead.count()) === 0,
    "tax-rules": async () => (await db.taxRule.count()) === 0,
    "due-rules": async () => (await db.dueRule.count()) === 0,
    "pension-tables": async () => (await db.ruleTable.count({ where: { code: "COMMUTATION_FACTORS" } })) === 0,
  };
  for (const part of installersFor("GOI_7CPC")) {
    if (!empty[part.key] || (part.module && !modules.includes(part.module)) || !(await empty[part.key]())) continue;
    await db.$transaction((tx) => part.install(tx, { tenantId, kind: "CANTONMENT_BOARD", modules: modules as never, today: todayIST() }));
  }
}

/** Payroll, tax and pension history for the DEMO organisation: two closed months, pensioners, a leaver. */
async function seedDemoPay(tenantId: string) {
  const db = tenantDb(tenantId);
  const userOf = async (loginId: string) => {
    const u = await db.user.findFirstOrThrow({ where: { loginId } });
    return { id: u.id, name: u.name };
  };
  const employees = await db.employee.findMany({ where: { employeeCode: { not: null } }, select: { id: true, employeeCode: true } });
  const people = new Map(employees.map((e) => [e.employeeCode!, e.id]));
  const [payroll, checker, signer] = await Promise.all([userOf("ACC01"), userOf("CHK01"), userOf("ADMIN")]);
  await seedPayrollDemo(db, people, { payroll, checker, signer });
  const [sections, posts] = await Promise.all([db.section.findMany(), db.post.findMany()]);
  const thisMonth = todayIST().slice(0, 7);
  await seedPensionDemo(db, {
    seal: (kind, value) => seal(tenantId, kind, value),
    sections: new Map(sections.map((s) => [s.code, s.id])),
    posts: new Map(posts.map((p) => [p.code, { id: p.id }])),
    months: [shiftMonth(thisMonth, -2), shiftMonth(thisMonth, -1)],
    users: { pension: payroll, checker, signer },
    passwordHash: await hashPassword(DEMO_PASSWORD),
  });
  await seedDemoLeaver(db);
}

/** A demo vacancy (advertised, with applicants) so the hiring screens have something to show. */
async function seedDemoHiring(tenantId: string, orgCode: string) {
  const db = tenantDb(tenantId);
  if ((await db.vacancy.count()) > 0) return;
  const rev = await db.section.findFirst({ where: { code: "REV" } });
  const ldc = await db.post.findFirst({ where: { code: "LDC" } });
  if (!rev || !ldc) return;
  const existing = await db.sanctionedPost.findFirst({ where: { sectionId: rev.id, postId: ldc.id } });
  if (existing) await db.sanctionedPost.update({ where: { id: existing.id }, data: { sanctioned: 4 } });
  else await db.sanctionedPost.create({ data: { sectionId: rev.id, postId: ldc.id, sanctioned: 4, orderRef: "Sanction order 2019 (demo)" } as Prisma.SanctionedPostUncheckedCreateInput });
  const year = todayIST().slice(0, 4);
  const vacancy = await db.vacancy.create({
    data: {
      referenceNo: `${orgCode}/REC/${year}/001`,
      sectionId: rev.id,
      postId: ldc.id,
      payLevel: "2",
      seats: 2,
      reservation: { GEN: 1, OBC: 1, SC: 0, ST: 0, EWS: 0 },
      advertNumber: `${orgCode}/ADV/07/${year}`,
      advertDate: fromISODate(`${year}-08-14`),
      lastDate: fromISODate(`${year}-09-15`),
      status: "ADVERTISED",
      createdById: "seed",
    } as Prisma.VacancyUncheckedCreateInput,
  });
  const applicants: [string, string, string, string, string, string][] = [
    ["Kiran Bala", "किरण बाला", "F", "1998-06-14", "OBC", "9811200001"],
    ["Rohit Saxena", "रोहित सक्सेना", "M", "1997-03-02", "GEN", "9811200002"],
    ["Anjali Meena", "अंजलि मीणा", "F", "1999-11-23", "ST", "9811200003"],
    ["Farhan Ali", "फ़रहान अली", "M", "1996-01-30", "GEN", "9811200004"],
  ];
  for (const [i, [name, nameHi, gender, dob, category, mobile]] of applicants.entries()) {
    await db.applicant.create({
      data: { vacancyId: vacancy.id, applicationNo: `A-${String(i + 1).padStart(4, "0")}`, name, nameHi, gender, dateOfBirth: fromISODate(dob), category, mobile, qualification: "Graduate, typing 35 wpm", status: i < 3 ? "SHORTLISTED" : "APPLIED" } as Prisma.ApplicantUncheckedCreateInput,
    });
  }
  // The running numbers carry on after the demo rows.
  await db.$transaction(async (tx) => {
    await nextNumber(tx, `vacancy-${year}`);
    for (let i = 0; i < applicants.length; i++) await nextNumber(tx, `applicant-${vacancy.id}`);
  });
}

/**
 * Ask AI: a few documents to try it with on a demo or training copy — how-to notes that describe this system, and
 * one sample office order. Added once, only while the organisation has no document of its own. Returns how many were added.
 */
export async function seedAskDocuments(db: TenantDb): Promise<number> {
  if (await db.knowledgeDoc.count()) return 0;
  const admin = await db.user.findFirst({ where: { loginType: "ADMIN", permissions: { has: "APPROVER" } }, orderBy: { loginId: "asc" } });
  if (!admin) return 0;
  const docs: { title: string; category: string; reference: string | null; audience: "EVERYONE" | "STAFF"; body: string }[] = [
    {
      title: "How to apply for leave",
      category: "HOWTO",
      reference: null,
      audience: "EVERYONE",
      body: [
        "Leave is applied for on the Leave screen. Choose the kind of leave, the first and last day, and write the reason. The screen shows how many days will be counted and what balance will be left before you send it.",
        "Who decides: your section head sanctions leave up to the limit set for each kind of leave. Longer leave, and leave for staff who have no section head on the system, is decided by the HR section. You get an SMS when it is decided.",
        "Casual leave cannot be joined with earned leave or half pay leave. A medical certificate is attached for leave on medical grounds. Restricted holidays can be taken only on a day in the restricted-holiday list.",
        "If your plans change, you can cancel leave that has not started. Leave already taken is corrected by the HR section.",
        "Staff who do not use the system give a paper application to the HR section, which enters it with the sanction order.",
      ].join("\n\n"),
    },
    {
      title: "Office hours and attendance (sample order — replace with your own)",
      category: "ORDER",
      reference: "Sample/ADM/01",
      audience: "EVERYONE",
      body: [
        "This is a sample order for practice. The organisation's Admin should replace it with the office order in force.",
        "Office hours are 9:00 a.m. to 5:30 p.m. from Monday to Friday, with lunch from 1:00 p.m. to 1:30 p.m. Saturdays and Sundays are weekly offs unless a section is told otherwise.",
        "Attendance is marked on the biometric device when coming in and when leaving. A person who comes in more than 15 minutes after office time is marked late. A person whose first and last punch are less than four hours apart is marked for half a day.",
        "If a punch is missed, or you were away on official duty, send a missed-punch or on-duty request from My attendance the same week. Your section head decides it.",
        "Each section head locks the section's attendance for the month by the 25th. Days without attendance, leave or an approved request are treated as dies-non and pay is not drawn for them.",
      ].join("\n\n"),
    },
    {
      title: "Payslips, tax and who to ask",
      category: "HOWTO",
      reference: null,
      audience: "EVERYONE",
      body: [
        "Your payslip is under My payslips once the month's salary has been paid. It can be opened in Hindi or English and downloaded as a PDF. A link is also sent by SMS and email.",
        "Income tax is deducted every month from an estimate of the whole year's income. To lower it under the old tax regime, fill in your declaration under My tax and attach the proofs before the date the Accounts section announces. Form 16 appears under My tax after the year ends.",
        "GPF subscribers see their account under My funds; NPS subscribers see the contributions deducted from pay and the employer's share.",
        "For a wrong amount on a payslip, a loan instalment or a tax question, write to the Accounts section. For a change of address, mobile number, bank account or nominee, send a request from My requests; a change of bank account takes effect once it is approved.",
      ].join("\n\n"),
    },
    {
      title: "Monthly payroll: order of work for the Accounts section",
      category: "HOWTO",
      reference: null,
      audience: "STAFF",
      body: [
        "Before the pay bill: every section's attendance for the previous month should be locked; approved leave, pay changes, new loans and standing deductions should be entered.",
        "Work out the salaries. Go through each point the pre-checks raise: a person without a bank account, net pay changed by more than 25 per cent, attendance not locked. Hold the pay or record why it is in order.",
        "After approval, download the bank file and upload it on the bank's portal. When the bank returns failed credits, upload the return file and make the re-payment file.",
        "Finish the month only after the salaries have reached the accounts: payslips are sent and the accounting summary is made. Then build the month's statutory files — NPS, EPF and ESIC — and deposit TDS by the due date shown on the Tax and funds screen.",
      ].join("\n\n"),
    },
  ];
  for (const d of docs) await db.knowledgeDoc.create({ data: { ...d, createdById: admin.id, createdByName: admin.name } as Prisma.KnowledgeDocUncheckedCreateInput });
  return docs.length;
}

/** Punches, a locked month, requests and leave for the DEMO organisation, from the original demo data. */
async function seedDemoAttendance(tenantId: string) {
  const db = tenantDb(tenantId);
  const [employees, users, hr] = await Promise.all([
    db.employee.findMany({ where: { status: "ACTIVE" }, include: { section: true } }),
    db.user.findMany({ where: { employeeId: { not: null } } }),
    db.user.findFirstOrThrow({ where: { loginId: "HR01" } }),
  ]);
  const byEmployee = new Map(users.map((u) => [u.employeeId!, u]));
  const userMap = new Map<string, { id: string; name: string }>();
  for (const e of employees) {
    const u = byEmployee.get(e.id);
    if (u && e.employeeCode) userMap.set(e.employeeCode, { id: u.id, name: u.name });
  }
  await syncDevices(tenantId, [DEMO_DEVICE]);
  await seedAttendance(
    db,
    tenantId,
    employees.map((e) => ({ id: e.id, code: e.employeeCode!, sectionCode: e.section.code, sectionId: e.sectionId, doj: e.dateOfJoining.toISOString().slice(0, 10), gender: e.gender, type: e.type })),
    userMap,
    { id: hr.id, name: hr.name },
  );
}

async function main() {
  const owner = await seedOwner();
  console.log(`Platform owner: ${owner.email}`);
  if (process.env.APP_ENV === "production") return;
  for (const demo of DEMO_TENANTS) {
    const { tenant: seeded, created } = await seedTenant(demo, owner.id);
    // Demo organisations follow the module list here (a module added to the demo after the first seed is switched on).
    const missing = (demo.org.modules as string[]).filter((m) => !seeded.modules.includes(m));
    const tenant = missing.length ? await rawDb().tenant.update({ where: { id: seeded.id }, data: { modules: [...seeded.modules, ...missing] } }) : seeded;
    const staff = demo.code === "DEMO" ? DEMO_STAFF : SMC_STAFF;
    const db = tenantDb(tenant.id);
    await topUpPack(tenant.id, tenant.modules);
    const people = await seedEmployees(db, tenant.id, tenant.code, staff, demo.code === "DEMO" ? 1 : 2, DEMO_PASSWORD);
    if (demo.code === "DEMO") {
      await seedDemoAttendance(tenant.id);
      await seedDemoPay(tenant.id);
      await seedDemoHiring(tenant.id, tenant.code);
      // Ask AI: on for everyone in the demo, with the practice documents (ASK_AI_PROVIDER=scripted answers without a key).
      if (!(await db.setting.findFirst({ where: { key: "ask" } }))) await db.setting.create({ data: { key: "ask", value: { audience: "everyone", provider: "gemini", models: { gemini: "gemini-3.8-flash", openai: "gpt-5.5", claude: "claude-opus-5-5" } } } as Prisma.SettingUncheckedCreateInput });
      await seedAskDocuments(db);
    }
    console.log(`${created ? "Created" : "Kept"} ${tenant.name} (${tenant.code})${people ? ` with ${people} employees` : ""}`);
  }
  console.log(`Demo password for every demo login: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(disconnectRaw);
