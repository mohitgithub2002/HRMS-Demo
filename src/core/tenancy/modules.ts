/**
 * The modules an organisation can have switched on (platform console → organisation → modules). Pure module:
 * menus, screens, APIs and the provisioning wizard all read it.
 */
export const MODULES = [
  "recruitment",
  "attendance",
  "leave",
  "payroll",
  "loans",
  "statutory",
  "pension",
  "reports",
  "ask",
] as const;

export type ModuleKey = (typeof MODULES)[number];

/** Modules that need another one to be useful. */
export const MODULE_NEEDS: Partial<Record<ModuleKey, ModuleKey[]>> = {
  leave: ["attendance"],
  loans: ["payroll"],
  statutory: ["payroll"],
  pension: ["payroll"],
};

/** What a new organisation gets unless the platform owner chooses otherwise. */
export const DEFAULT_MODULES: ModuleKey[] = ["recruitment", "attendance", "leave", "payroll", "loans", "statutory", "pension", "reports"];

export function isModuleKey(v: string): v is ModuleKey {
  return (MODULES as readonly string[]).includes(v);
}

/** Adds what each chosen module needs, drops unknown names, keeps a stable order. */
export function normaliseModules(chosen: readonly string[]): ModuleKey[] {
  const set = new Set<ModuleKey>(chosen.filter(isModuleKey));
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of [...set]) {
      for (const need of MODULE_NEEDS[m] ?? []) {
        if (!set.has(need)) {
          set.add(need);
          grew = true;
        }
      }
    }
  }
  return MODULES.filter((m) => set.has(m));
}

export function hasModule(modules: readonly string[], m: ModuleKey): boolean {
  return modules.includes(m);
}
