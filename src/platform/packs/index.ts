/**
 * Starter packs: what a new organisation's masters are copied from. Order matters (later parts may read earlier
 * ones). Modules append their installers here as they are built.
 */
import { holidayInstaller, leaveInstaller } from "./leave-attendance";
import { matrixInstaller } from "./matrix";
import { structureInstaller } from "./structure";
import type { PackInstaller, PackKey } from "./types";

export const PACK_VERSION = 1;

const GOI_7CPC: PackInstaller[] = [structureInstaller, matrixInstaller, leaveInstaller, holidayInstaller];

export function installersFor(pack: PackKey): PackInstaller[] {
  return pack === "GOI_7CPC" ? GOI_7CPC : [];
}
