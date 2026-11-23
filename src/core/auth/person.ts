/**
 * What a login's employee record means for access (§2 rules 5 and 6): the section (a section head's scope), whether
 * the person is on the rolls or a pensioner, and whether access has ended (retirement, resignation, transfer, death).
 * A family pensioner may have a login of their own with only a pension (core/auth/pensioner.ts).
 */
import type { LoginType, UserStatus } from "@/generated/prisma/enums";
import { todayIST, toISODate } from "@/core/dates";
import type { TenantDb } from "@/core/tenancy/scoped";
import { accessState } from "./access-state";
import { pensionOfUser } from "./pensioner";

export interface PersonAccess {
  hasAccess: boolean;
  isEmployee: boolean;
  isPensioner: boolean;
  sectionId: string | null;
  pensionerId: string | null;
}

export async function resolvePerson(db: TenantDb, user: { employeeId: string | null; pensionerId?: string | null; status: UserStatus; loginType: LoginType }): Promise<PersonAccess> {
  if (!user.employeeId && user.pensionerId && user.loginType === "EMPLOYEE") {
    // A family pensioner's own login: no employee record of their own, only the pension.
    const pension = await pensionOfUser(db, { pensionerId: user.pensionerId, employeeId: null });
    const s = accessState({ userStatus: user.status, loginType: user.loginType, employee: null, pensionFrom: pension?.from ?? null }, todayIST());
    return { hasAccess: s.allowed, isEmployee: false, isPensioner: s.isPensioner, sectionId: null, pensionerId: s.isPensioner ? (pension?.id ?? null) : null };
  }
  if (!user.employeeId) {
    const s = accessState({ userStatus: user.status, loginType: user.loginType, employee: null, pensionFrom: null }, todayIST());
    return { hasAccess: s.allowed, isEmployee: false, isPensioner: false, sectionId: null, pensionerId: null };
  }
  const [e, pension] = await Promise.all([
    db.employee.findUnique({ where: { id: user.employeeId }, select: { status: true, exitDate: true, dateOfRetirement: true, sectionId: true } }),
    pensionOfUser(db, { pensionerId: user.pensionerId ?? null, employeeId: user.employeeId }),
  ]);
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
