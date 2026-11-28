/**
 * What a login's employee record means for access (§2 rules 5 and 6): the section (a section head's scope), whether
 * the person is on the rolls or a pensioner, and whether access has ended (retirement, resignation, transfer, death).
 * A family pensioner may have a login of their own with only a pension (core/auth/pensioner.ts).
 */
import type { EmployeeStatus, LoginType, UserStatus } from "@/generated/prisma/enums";
import { todayIST, toISODate, type ISODate } from "@/core/dates";
import type { TenantDb } from "@/core/tenancy/scoped";
import { accessState } from "./access-state";
import { pensionOfUser, pensionView } from "./pensioner";

export interface PersonAccess {
  hasAccess: boolean;
  isEmployee: boolean;
  isPensioner: boolean;
  sectionId: string | null;
  pensionerId: string | null;
}

type PensionRow = { id: string; startDate: Date; endDate: Date | null };
type EmployeeRow = { status: EmployeeStatus; exitDate: Date | null; dateOfRetirement: Date | null; sectionId: string | null };
type UserFacts = { employeeId: string | null; pensionerId?: string | null; status: UserStatus; loginType: LoginType };

/**
 * What to read with a login so its access is known from one query: its employee record, the pension that employee
 * earned, and the pension of a family pensioner's own login (pensionOfUser's rule, as relations).
 */
export const PERSON_INCLUDE = {
  employee: {
    select: {
      status: true,
      exitDate: true,
      dateOfRetirement: true,
      sectionId: true,
      pensioners: { where: { relation: "SELF" }, orderBy: { startDate: "desc" }, take: 1, select: { id: true, startDate: true, endDate: true } },
    },
  },
  pensioner: { select: { id: true, startDate: true, endDate: true } },
} as const;

/** The access of a login read with PERSON_INCLUDE (pure). */
export function personOf(user: UserFacts & { employee: (EmployeeRow & { pensioners: PensionRow[] }) | null; pensioner: PensionRow | null }): PersonAccess {
  const pensionRow = user.pensionerId ? user.pensioner : (user.employee?.pensioners[0] ?? null);
  return accessOf(user, user.employeeId ? user.employee : null, pensionView(pensionRow));
}

export async function resolvePerson(db: TenantDb, user: UserFacts): Promise<PersonAccess> {
  if (!user.employeeId && user.pensionerId && user.loginType === "EMPLOYEE") {
    // A family pensioner's own login: no employee record of their own, only the pension.
    return accessOf(user, null, await pensionOfUser(db, { pensionerId: user.pensionerId, employeeId: null }));
  }
  if (!user.employeeId) return accessOf(user, null, null);
  const [e, pension] = await Promise.all([
    db.employee.findUnique({ where: { id: user.employeeId }, select: { status: true, exitDate: true, dateOfRetirement: true, sectionId: true } }),
    pensionOfUser(db, { pensionerId: user.pensionerId ?? null, employeeId: user.employeeId }),
  ]);
  return accessOf(user, e, pension);
}

function accessOf(user: UserFacts, e: EmployeeRow | null, pension: { id: string; from: ISODate } | null): PersonAccess {
  if (!user.employeeId) {
    const familyPension = user.pensionerId && user.loginType === "EMPLOYEE" ? pension : null;
    const s = accessState({ userStatus: user.status, loginType: user.loginType, employee: null, pensionFrom: familyPension?.from ?? null }, todayIST());
    return { hasAccess: s.allowed, isEmployee: false, isPensioner: s.isPensioner, sectionId: null, pensionerId: s.isPensioner ? (familyPension?.id ?? null) : null };
  }
  const s = accessState(
    {
      userStatus: user.status,
      loginType: user.loginType,
      employee: e ? { status: e.status, exitDate: e.exitDate ? toISODate(e.exitDate) : null, dateOfRetirement: e.dateOfRetirement ? toISODate(e.dateOfRetirement) : null } : null,
      pensionFrom: pension?.from ?? null,
    },
    todayIST(),
  );
  return { hasAccess: s.allowed, isEmployee: s.isEmployee, isPensioner: s.isPensioner, sectionId: s.isEmployee ? (e?.sectionId ?? null) : null, pensionerId: s.isPensioner ? (pension?.id ?? null) : null };
}
