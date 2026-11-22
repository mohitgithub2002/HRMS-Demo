/**
 * What a login's employee record means for access: section (a reporting officer's scope), whether the person is on
 * the rolls, a pensioner, or has left (PRD §2 rule 6: access ends on leaving). The employee and pension modules
 * fill this in; until a login is linked to an employee it is a plain staff login.
 */
import type { TenantDb } from "@/core/tenancy/scoped";

export interface PersonAccess {
  hasAccess: boolean;
  isEmployee: boolean;
  isPensioner: boolean;
  sectionId: string | null;
  pensionerId: string | null;
}

type Resolver = (db: TenantDb, employeeId: string) => Promise<PersonAccess>;
let resolver: Resolver | null = null;

/** The employee module registers how a record turns into access. */
export function registerPersonResolver(fn: Resolver) {
  resolver = fn;
}

export async function resolvePerson(db: TenantDb, employeeId: string | null): Promise<PersonAccess> {
  if (!employeeId || !resolver) return { hasAccess: true, isEmployee: Boolean(employeeId), isPensioner: false, sectionId: null, pensionerId: null };
  return resolver(db, employeeId);
}
