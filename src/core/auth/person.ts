/**
 * What a login's employee record means for access (§2 rules 5 and 6): the section (a section head's scope), whether
 * the person is on the rolls or a pensioner, and whether access has ended (retirement, resignation, transfer, death).
 * Pensions are added by the pension module (registerPensionLookup).
 */
import type { LoginType, UserStatus } from "@/generated/prisma/enums";
import { todayIST, toISODate } from "@/core/dates";
import type { TenantDb } from "@/core/tenancy/scoped";
import { accessState } from "./access-state";

export interface PersonAccess {
  hasAccess: boolean;
  isEmployee: boolean;
  isPensioner: boolean;
  sectionId: string | null;
  pensionerId: string | null;
}

type PensionLookup = (db: TenantDb, employeeId: string) => Promise<{ id: string; from: string } | null>;
let pensionLookup: PensionLookup | null = null;

export function registerPensionLookup(fn: PensionLookup) {
  pensionLookup = fn;
}

export async function resolvePerson(db: TenantDb, user: { employeeId: string | null; status: UserStatus; loginType: LoginType }): Promise<PersonAccess> {
  if (!user.employeeId) {
    const s = accessState({ userStatus: user.status, loginType: user.loginType, employee: null, pensionFrom: null }, todayIST());
    return { hasAccess: s.allowed, isEmployee: false, isPensioner: false, sectionId: null, pensionerId: null };
  }
  const [e, pension] = await Promise.all([
    db.employee.findUnique({ where: { id: user.employeeId }, select: { status: true, exitDate: true, dateOfRetirement: true, sectionId: true } }),
    pensionLookup ? pensionLookup(db, user.employeeId) : null,
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
