import "server-only";
/**
 * The guided setup: each step's state is worked out from the organisation's own data, never ticked by hand, so the
 * checklist can never say "done" for something that is not. Modules add their steps as they are built.
 */
import type { Actor } from "@/core/auth/session";
import { fromISODate, todayIST } from "@/core/dates";
import { getTenantProfile } from "@/core/tenancy/tenant";
import type { TKey } from "@/i18n";
import { getSettings } from "@/modules/settings/store";

export interface SetupStep {
  key: string;
  title: TKey;
  hint: TKey;
  href: string;
  done: boolean;
  optional?: boolean;
  /** A short figure next to the step ("12 sections"). */
  figure?: string;
}

export async function setupStatus(actor: Actor) {
  const db = actor.db;
  const year = todayIST().slice(0, 4);
  const modules = actor.tenant.modules;
  const [profile, settings, savedKeys, sections, posts, staffLogins, employees, holidays, leaveEntries] = await Promise.all([
    getTenantProfile(actor.tenantId),
    getSettings(db),
    db.setting.findMany({ select: { key: true } }),
    db.section.count({ where: { isActive: true } }),
    db.post.count({ where: { isActive: true } }),
    db.user.count({ where: { status: "ACTIVE", loginType: "HR_ACCOUNTS" } }),
    db.employee.count({ where: { status: { in: ["ACTIVE", "SUSPENDED"] } } }),
    modules.includes("attendance") ? db.holiday.count({ where: { date: { gte: fromISODate(`${year}-01-01`), lte: fromISODate(`${year}-12-31`) } } }) : 0,
    modules.includes("leave") ? db.leaveLedger.count() : 0,
  ]);
  const saved = new Set(savedKeys.map((s) => s.key));
  const steps: SetupStep[] = [
    { key: "profile", title: "setup.step.profile.title", hint: "setup.step.profile.hint", href: "/admin/organisation", done: Boolean(profile.address && profile.nameHi) },
    { key: "ids", title: "setup.step.ids.title", hint: "setup.step.ids.hint", href: "/admin/settings#statutory", done: Boolean(settings.statutory.tan && settings.statutory.deductorName) },
    { key: "workflow", title: "setup.step.workflow.title", hint: "setup.step.workflow.hint", href: "/admin/settings#workflow", done: saved.has("workflow") },
    { key: "sections", title: "setup.step.sections.title", hint: "setup.step.sections.hint", href: "/admin/sections", done: sections > 0, figure: String(sections) },
    { key: "posts", title: "setup.step.posts.title", hint: "setup.step.posts.hint", href: "/admin/posts", done: posts > 0, figure: String(posts) },
    { key: "users", title: "setup.step.users.title", hint: "setup.step.users.hint", href: "/admin/users", done: staffLogins > 0, figure: String(staffLogins) },
    ...(modules.includes("attendance")
      ? [{ key: "attendance", title: "setup.step.attendance.title" as const, hint: "setup.step.attendance.hint" as const, href: "/attendance/holidays", done: saved.has("attendance") && holidays > 3, figure: String(holidays) }]
      : []),
    { key: "employees", title: "setup.step.employees.title", hint: "setup.step.employees.hint", href: "/employees", done: employees > 0, figure: String(employees) },
    ...(modules.includes("leave")
      ? [{ key: "leave", title: "setup.step.leave.title" as const, hint: "setup.step.leave.hint" as const, href: "/leave/manage", done: leaveEntries > 0 }]
      : []),
    { key: "bank", title: "setup.step.bank.title", hint: "setup.step.bank.hint", href: "/admin/settings#bank", done: Boolean(settings.bank.name && settings.bank.ifsc) },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, finished: Boolean(profile.setupCompletedAt) };
}
