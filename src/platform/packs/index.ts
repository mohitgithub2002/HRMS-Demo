/**
 * Starter packs: what a new organisation's masters are copied from. Order matters (later parts may read earlier
 * ones). Modules append their installers here as they are built.
 */
import { structureInstaller } from "./structure";
import type { PackInstaller, PackKey } from "./types";

export const PACK_VERSION = 1;

const GOI_7CPC: PackInstaller[] = [structureInstaller];

export function installersFor(pack: PackKey): PackInstaller[] {
  return pack === "GOI_7CPC" ? GOI_7CPC : [];
}
