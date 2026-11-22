import type { Tx } from "@/core/tenancy/scoped";
import type { ModuleKey } from "@/core/tenancy/modules";

export type PackKey = "GOI_7CPC" | "EMPTY";
export const PACKS: PackKey[] = ["GOI_7CPC", "EMPTY"];

export type TenantKind = "CANTONMENT_BOARD" | "MUNICIPAL" | "GOVT_BODY" | "COMPANY" | "OTHER";
export const TENANT_KINDS: TenantKind[] = ["CANTONMENT_BOARD", "MUNICIPAL", "GOVT_BODY", "COMPANY", "OTHER"];

export interface InstallContext {
  tenantId: string;
  kind: TenantKind;
  modules: readonly ModuleKey[];
  /** "YYYY-MM-DD" in India: dated tables start from the right year. */
  today: string;
}

/**
 * One part of a starter pack. Each module that keeps masters (pay matrix, leave types, tax slabs …) adds an installer;
 * installers run in order inside the tenant's provisioning transaction, and only for modules the organisation has.
 */
export interface PackInstaller {
  key: string;
  /** The module this part belongs to; absent = always installed. */
  module?: ModuleKey;
  install(tx: Tx, ctx: InstallContext): Promise<void>;
}
