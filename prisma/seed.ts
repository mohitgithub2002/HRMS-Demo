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
import { tenantDb } from "@/core/tenancy/scoped";
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
    const { tenant, created } = await seedTenant(demo, owner.id);
    const staff = demo.code === "DEMO" ? DEMO_STAFF : SMC_STAFF;
    const db = tenantDb(tenant.id);
    await topUpPack(tenant.id, tenant.modules);
    const people = await seedEmployees(db, tenant.id, tenant.code, staff, demo.code === "DEMO" ? 1 : 2, DEMO_PASSWORD);
    if (demo.code === "DEMO") {
      await seedDemoAttendance(tenant.id);
      await seedDemoPay(tenant.id);
      await seedDemoHiring(tenant.id, tenant.code);
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
