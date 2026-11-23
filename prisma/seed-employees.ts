/**
 * Demo employees for the two fictional organisations: people of every type across sections, with family, nominees,
 * an appointment entry in the service book and sanctioned strength. Names and numbers are made up; identity numbers
 * pass the format checks (PAN shape, Aadhaar Verhoeff digit) but belong to nobody.
 */
import type { Prisma } from "@/generated/prisma/client";
import { seal } from "@/core/crypto";
import { addDays, addYears, fromISODate, retirementDate } from "@/core/dates";
import { hashPassword } from "@/core/password";
import type { TenantDb } from "@/core/tenancy/scoped";
import { verhoeffCheckDigit } from "@/core/validators";
import { fullName } from "@/modules/employees/present";

type Type = "PERMANENT_OPS" | "PERMANENT_NPS" | "CONTRACT" | "DAILY_WAGE" | "REEMPLOYED" | "DEPUTATION";
export interface DemoEmployee {
  first: string;
  last: string;
  hi: string;
  gender: "M" | "F";
  dob: string;
  doj: string;
  section: string;
  post: string;
  type: Type;
  cell?: number;
  mobile: string;
  /** Office login to link to this record (seeded by seed.ts), or a section head's login. */
  login?: string;
  officer?: boolean;
}

export const DEMO_STAFF: DemoEmployee[] = [
  { first: "Anita", last: "Sharma", hi: "अनीता शर्मा", gender: "F", dob: "1972-03-14", doj: "2022-06-01", section: "ADM", post: "CEO", type: "DEPUTATION", cell: 9, mobile: "9810000001", login: "ADMIN" },
  { first: "Sunita", last: "Verma", hi: "सुनीता वर्मा", gender: "F", dob: "1970-08-22", doj: "1996-04-15", section: "ADM", post: "AO", type: "PERMANENT_OPS", cell: 14, mobile: "9810000002" },
  { first: "Priya", last: "Singh", hi: "प्रिया सिंह", gender: "F", dob: "1985-11-05", doj: "2010-07-12", section: "ADM", post: "HC", type: "PERMANENT_NPS", cell: 8, mobile: "9810000003", login: "HR01" },
  { first: "Mohit", last: "Gupta", hi: "मोहित गुप्ता", gender: "M", dob: "1988-01-19", doj: "2012-03-01", section: "ACC", post: "ACCT", type: "PERMANENT_NPS", cell: 7, mobile: "9810000004", login: "ACC01" },
  { first: "Kavita", last: "Rani", hi: "कविता रानी", gender: "F", dob: "1979-06-30", doj: "2003-09-01", section: "ACC", post: "UDC", type: "PERMANENT_OPS", cell: 12, mobile: "9810000005" },
  { first: "Deepak", last: "Yadav", hi: "दीपक यादव", gender: "M", dob: "1983-04-01", doj: "2008-11-20", section: "ACC", post: "OS", type: "PERMANENT_NPS", cell: 6, mobile: "9810000006", login: "CHK01" },
  { first: "Neha", last: "Arora", hi: "नेहा अरोड़ा", gender: "F", dob: "1990-12-12", doj: "2015-02-02", section: "ADM", post: "UDC", type: "PERMANENT_NPS", cell: 5, mobile: "9810000008" },
  { first: "Rajesh", last: "Kumar", hi: "राजेश कुमार", gender: "M", dob: "1968-01-01", doj: "1991-08-01", section: "HLT", post: "SI", type: "PERMANENT_OPS", cell: 18, mobile: "9810000009", officer: true },
  { first: "Ramesh", last: "Chand", hi: "रमेश चंद", gender: "M", dob: "1967-02-10", doj: "1990-05-14", section: "HLT", post: "SK", type: "PERMANENT_OPS", cell: 20, mobile: "9810000010" },
  { first: "Suresh", last: "Pal", hi: "सुरेश पाल", gender: "M", dob: "1992-09-09", doj: "2018-01-08", section: "HLT", post: "SK", type: "PERMANENT_NPS", cell: 6, mobile: "9810000011" },
  { first: "Meena", last: "Devi", hi: "मीना देवी", gender: "F", dob: "1987-05-25", doj: "2014-06-16", section: "HLT", post: "SK", type: "PERMANENT_NPS", cell: 9, mobile: "9810000012" },
  { first: "Vikas", last: "Malhotra", hi: "विकास मल्होत्रा", gender: "M", dob: "1984-07-17", doj: "2009-10-05", section: "ENG", post: "JE", type: "PERMANENT_NPS", cell: 10, mobile: "9810000013" },
  { first: "Arun", last: "Joshi", hi: "अरुण जोशी", gender: "M", dob: "1975-10-03", doj: "2001-12-10", section: "ENG", post: "AE", type: "PERMANENT_OPS", cell: 13, mobile: "9810000014" },
  { first: "Pooja", last: "Bhatia", hi: "पूजा भाटिया", gender: "F", dob: "1993-03-28", doj: "2024-11-18", section: "EDU", post: "PRT", type: "PERMANENT_NPS", cell: 3, mobile: "9810000015" },
  { first: "Sanjay", last: "Rawat", hi: "संजय रावत", gender: "M", dob: "1981-08-08", doj: "2006-04-03", section: "WTR", post: "PMP", type: "PERMANENT_NPS", cell: 12, mobile: "9810000016" },
  { first: "Geeta", last: "Negi", hi: "गीता नेगी", gender: "F", dob: "1980-02-14", doj: "2004-03-15", section: "HSP", post: "SN", type: "PERMANENT_NPS", cell: 13, mobile: "9810000017" },
  { first: "Dr. Alok", last: "Mishra", hi: "डॉ. आलोक मिश्रा", gender: "M", dob: "1976-11-30", doj: "2005-08-22", section: "HSP", post: "MO", type: "PERMANENT_NPS", cell: 15, mobile: "9810000018" },
  { first: "Harish", last: "Thakur", hi: "हरीश ठाकुर", gender: "M", dob: "1966-12-31", doj: "1989-01-09", section: "ELE", post: "ELC", type: "PERMANENT_OPS", cell: 22, mobile: "9810000019" },
  { first: "Manoj", last: "Tiwari", hi: "मनोज तिवारी", gender: "M", dob: "1989-06-06", doj: "2013-09-09", section: "REV", post: "LDC", type: "PERMANENT_NPS", cell: 9, mobile: "9810000020" },
  { first: "Shalini", last: "Kapoor", hi: "शालिनी कपूर", gender: "F", dob: "1991-01-23", doj: "2016-11-14", section: "EST", post: "LDC", type: "PERMANENT_NPS", cell: 7, mobile: "9810000021" },
  { first: "Ravi", last: "Prakash", hi: "रवि प्रकाश", gender: "M", dob: "1995-04-04", doj: "2023-04-03", section: "HRT", post: "MALI", type: "CONTRACT", mobile: "9810000022" },
  { first: "Babita", last: "Kumari", hi: "बबिता कुमारी", gender: "F", dob: "1997-07-07", doj: "2024-01-15", section: "HLT", post: "SK", type: "DAILY_WAGE", mobile: "9810000023" },
  { first: "Om", last: "Prakash", hi: "ओम प्रकाश", gender: "M", dob: "1963-09-15", doj: "2024-10-01", section: "ACC", post: "ACCT", type: "REEMPLOYED", mobile: "9810000024" },
  { first: "Ashok", last: "Saini", hi: "अशोक सैनी", gender: "M", dob: "1986-10-10", doj: "2011-05-02", section: "ADM", post: "DRV", type: "PERMANENT_NPS", cell: 11, mobile: "9810000025" },
  { first: "Rekha", last: "Sharma", hi: "रेखा शर्मा", gender: "F", dob: "1966-11-20", doj: "1992-02-17", section: "EDU", post: "PRT", type: "PERMANENT_OPS", cell: 21, mobile: "9810000026" },
];

export const SMC_STAFF: DemoEmployee[] = [
  { first: "Vikram", last: "Thakur", hi: "विक्रम ठाकुर", gender: "M", dob: "1974-05-02", doj: "2019-08-01", section: "ADM", post: "CEO", type: "DEPUTATION", cell: 6, mobile: "9820000001", login: "ADMIN" },
  { first: "Neha", last: "Verma", hi: "नेहा वर्मा", gender: "F", dob: "1988-02-11", doj: "2013-04-01", section: "ACC", post: "ACCT", type: "PERMANENT_NPS", cell: 9, mobile: "9820000003", login: "HR01" },
  { first: "Kamal", last: "Chauhan", hi: "कमल चौहान", gender: "M", dob: "1979-09-19", doj: "2005-07-11", section: "HLT", post: "SI", type: "PERMANENT_OPS", cell: 14, mobile: "9820000004", officer: true },
  { first: "Sita", last: "Devi", hi: "सीता देवी", gender: "F", dob: "1985-01-30", doj: "2012-12-03", section: "HLT", post: "SK", type: "PERMANENT_NPS", cell: 10, mobile: "9820000005" },
  { first: "Ajay", last: "Negi", hi: "अजय नेगी", gender: "M", dob: "1990-06-21", doj: "2016-02-15", section: "WTR", post: "PMP", type: "PERMANENT_NPS", cell: 8, mobile: "9820000006" },
  { first: "Ritu", last: "Rana", hi: "ऋतु राणा", gender: "F", dob: "1994-10-08", doj: "2021-09-01", section: "ADM", post: "LDC", type: "PERMANENT_NPS", cell: 4, mobile: "9820000007" },
  { first: "Mohan", last: "Lal", hi: "मोहन लाल", gender: "M", dob: "1996-03-17", doj: "2024-04-01", section: "HRT", post: "MALI", type: "CONTRACT", mobile: "9820000008" },
];

function demoIds(i: number, last: string, salt: number) {
  const base = `${2 + (i % 7)}${String(4100000000 + i * 7919 + salt * 131).padStart(10, "0")}`;
  const aadhaar = base + verhoeffCheckDigit(base);
  const pan = `A${String.fromCharCode(66 + (salt % 20))}${String.fromCharCode(67 + (i % 20))}P${last[0].toUpperCase()}${String(1000 + i * 37).slice(-4)}${String.fromCharCode(65 + (i % 26))}`;
  const bank = `3${String(1000000000 + i * 104729 + salt * 977).padStart(10, "0")}`;
  return { aadhaar, pan, bank };
}

const MATRIX: Type[] = ["PERMANENT_OPS", "PERMANENT_NPS", "DEPUTATION"];

export async function seedEmployees(db: TenantDb, tenantId: string, orgCode: string, staff: DemoEmployee[], salt: number, password: string) {
  if ((await db.employee.count()) > 0) return 0;
  const [sections, posts] = await Promise.all([db.section.findMany(), db.post.findMany()]);
  const section = new Map(sections.map((s) => [s.code, s]));
  const post = new Map(posts.map((p) => [p.code, p]));
  const passwordHash = await hashPassword(password);
  await db.$transaction(
    async (tx) => {
      for (const [i, e] of staff.entries()) {
        const s = section.get(e.section)!;
        const p = post.get(e.post)!;
        const code = `${orgCode}${String(i + 1).padStart(5, "0")}`;
        const ids = demoIds(i + 1, e.last, salt);
        const pan = seal(tenantId, "pan", ids.pan);
        const aadhaar = seal(tenantId, "aadhaar", ids.aadhaar);
        const bank = seal(tenantId, "bank", ids.bank);
        const matrix = MATRIX.includes(e.type);
        const address = { line1: `${100 + i} Sadar Bazar`, line2: "", city: "New Delhi", district: "New Delhi", state: "Delhi", pincode: "110010" };
        const row = await tx.employee.create({
          data: {
            employeeCode: code,
            status: "ACTIVE",
            type: e.type,
            firstName: e.first,
            lastName: e.last,
            nameHi: e.hi,
            gender: e.gender,
            dateOfBirth: fromISODate(e.dob),
            dateOfJoining: fromISODate(e.doj),
            dateOfRetirement: matrix ? fromISODate(retirementDate(e.dob, p.retirementAge)) : null,
            sectionId: s.id,
            postId: p.id,
            payLevel: e.cell ? p.payLevel : null,
            payCell: e.cell ?? null,
            mobile: e.mobile,
            email: `${e.first.toLowerCase().replace(/[^a-z]/g, "")}.${e.last.toLowerCase()}@example.org`,
            fatherOrSpouseName: e.gender === "F" ? "Shri Ram Prasad" : "Shri Mohan Lal",
            category: ["GEN", "OBC", "SC", "GEN", "ST"][i % 5],
            maritalStatus: "MARRIED",
            presentAddress: address,
            permanentAddress: address,
            panEnc: pan.enc,
            panHash: pan.hash,
            panLast4: pan.last4,
            aadhaarEnc: aadhaar.enc,
            aadhaarHash: aadhaar.hash,
            aadhaarLast4: aadhaar.last4,
            bankAccountEnc: bank.enc,
            bankAccountHash: bank.hash,
            bankAccountLast4: bank.last4,
            ifsc: "SBIN0001234",
            bankName: "State Bank of India",
            bankBranch: "Main Branch",
            pran: e.type === "PERMANENT_NPS" ? String(110000000000 + i * 1013 + salt) : null,
            gpfNumber: e.type === "PERMANENT_OPS" ? `${orgCode}/GPF/${1000 + i}` : null,
            uan: ["CONTRACT", "DAILY_WAGE"].includes(e.type) ? String(100900000000 + i * 211 + salt) : null,
            esicNumber: ["CONTRACT", "DAILY_WAGE"].includes(e.type) ? String(2010000000 + i * 97 + salt) : null,
            agencyName: e.type === "CONTRACT" ? "Shiv Shakti Manpower Services" : null,
            wageRate: e.type === "CONTRACT" ? 21917 : e.type === "DAILY_WAGE" ? 843 : e.type === "REEMPLOYED" ? 45000 : null,
            wageBasis: e.type === "DAILY_WAGE" ? "DAILY" : ["CONTRACT", "REEMPLOYED"].includes(e.type) ? "MONTHLY" : null,
            contractStart: ["CONTRACT", "REEMPLOYED"].includes(e.type) ? fromISODate(e.doj) : null,
            contractEnd: ["CONTRACT", "REEMPLOYED"].includes(e.type) ? fromISODate("2027-03-31") : null,
            biometricId: String(1001 + i),
            probationEndDate: ["PERMANENT_OPS", "PERMANENT_NPS"].includes(e.type) && e.doj > "2020-01-01" ? fromISODate(addDays(addYears(e.doj, 2), -1)) : null,
            createdById: "seed",
          } as Prisma.EmployeeUncheckedCreateInput,
        });
        // Family, nominees, the appointment in the service book.
        const spouse = await tx.familyMember.create({
          data: { employeeId: row.id, name: e.gender === "F" ? `Shri ${["Rakesh", "Sunil", "Vijay"][i % 3]} ${e.last}` : `Smt. ${["Anita", "Sunita", "Rekha"][i % 3]} ${e.last}`, relation: "SPOUSE", gender: e.gender === "F" ? "M" : "F", dateOfBirth: fromISODate(addYears(e.dob, 2)), isDependent: true } as Prisma.FamilyMemberUncheckedCreateInput,
        });
        const child = await tx.familyMember.create({
          data: { employeeId: row.id, name: `${["Aarav", "Diya", "Kabir", "Ananya"][i % 4]} ${e.last}`, relation: i % 2 ? "DAUGHTER" : "SON", gender: i % 2 ? "F" : "M", dateOfBirth: fromISODate(addYears(e.doj, 3)), isDependent: true } as Prisma.FamilyMemberUncheckedCreateInput,
        });
        const scheme = e.type === "PERMANENT_OPS" ? "GPF" : e.type === "PERMANENT_NPS" ? "NPS" : null;
        if (scheme) {
          await tx.nominee.createMany({
            data: [
              { employeeId: row.id, scheme, familyMemberId: spouse.id, sharePercent: 60 },
              { employeeId: row.id, scheme, familyMemberId: child.id, sharePercent: 40 },
              { employeeId: row.id, scheme: "GRATUITY", familyMemberId: spouse.id, sharePercent: 100 },
            ] as Prisma.NomineeCreateManyInput[],
          });
        }
        await tx.serviceBookEntry.create({
          data: {
            employeeId: row.id,
            event: "APPOINTMENT",
            eventDate: fromISODate(e.doj),
            orderNumber: `${orgCode}/EST/${e.doj.slice(0, 4)}/${100 + i}`,
            orderDate: fromISODate(e.doj),
            details: `Appointed as ${p.name} in ${s.name}.`,
            detailsHi: p.nameHi && s.nameHi ? `${p.nameHi} के पद पर ${s.nameHi} में नियुक्ति।` : null,
            status: "APPROVED",
            createdById: "seed",
          } as Prisma.ServiceBookEntryUncheckedCreateInput,
        });
        if (e.cell && p.payLevel) {
          await tx.payHistory.create({
            data: { employeeId: row.id, effectiveFrom: fromISODate(e.doj), payLevel: p.payLevel, payCell: e.cell, postId: p.id, reason: "INITIAL", applied: true, createdById: "seed" } as Prisma.PayHistoryUncheckedCreateInput,
          });
        }
        // Logins: the office login named in `login` belongs to this person; everyone else gets their own Employee login.
        if (e.login) {
          await tx.user.updateMany({ where: { loginId: e.login }, data: { employeeId: row.id } });
        } else {
          await tx.user.create({
            data: { loginId: code, name: fullName(row), loginType: "EMPLOYEE", permissions: e.officer ? ["REPORTING_OFFICER"] : [], mobile: e.mobile, employeeId: row.id, passwordHash, mustChangePassword: false } as Prisma.UserUncheckedCreateInput,
          });
        }
      }
      await tx.sequence.create({ data: { name: "employee", value: staff.length } as Prisma.SequenceUncheckedCreateInput });
      // Sanctioned strength: a little above today's staff so vacancies show.
      const filled = await tx.employee.groupBy({ by: ["sectionId", "postId"], where: { type: { in: MATRIX } }, _count: { _all: true } });
      await tx.sanctionedPost.createMany({
        data: filled.map((f, i) => ({ sectionId: f.sectionId, postId: f.postId, sanctioned: f._count._all + (i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0), orderRef: "Sanction order 2019 (demo)" })) as Prisma.SanctionedPostCreateManyInput[],
      });
    },
    { timeout: 120_000 },
  );
  return staff.length;
}
