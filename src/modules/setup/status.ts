import "server-only";
/**
 * The guided setup: each step's state is worked out from the organisation's own data, never ticked by hand, so the
 * checklist can never say "done" for something that is not. Modules add their steps as they are built.
 */
import type { Actor } from "@/core/auth/session";
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
  const [profile, settings, savedKeys, sections, posts, staffLogins] = await Promise.all([
    getTenantProfile(actor.tenantId),
    getSettings(db),
    db.setting.findMany({ select: { key: true } }),
    db.section.count({ where: { isActive: true } }),
    db.post.count({ where: { isActive: true } }),
    db.user.count({ where: { status: "ACTIVE", loginType: "HR_ACCOUNTS" } }),
  ]);
  const saved = new Set(savedKeys.map((s) => s.key));
  const steps: SetupStep[] = [
    { key: "profile", title: "setup.step.profile.title", hint: "setup.step.profile.hint", href: "/admin/organisation", done: Boolean(profile.address && profile.nameHi) },
    { key: "ids", title: "setup.step.ids.title", hint: "setup.step.ids.hint", href: "/admin/settings#statutoryIds", done: Boolean(settings.statutoryIds.tan || settings.statutoryIds.ddoCode) },
    { key: "workflow", title: "setup.step.workflow.title", hint: "setup.step.workflow.hint", href: "/admin/settings#workflow", done: saved.has("workflow") },
    { key: "sections", title: "setup.step.sections.title", hint: "setup.step.sections.hint", href: "/admin/sections", done: sections > 0, figure: String(sections) },
    { key: "posts", title: "setup.step.posts.title", hint: "setup.step.posts.hint", href: "/admin/posts", done: posts > 0, figure: String(posts) },
    { key: "users", title: "setup.step.users.title", hint: "setup.step.users.hint", href: "/admin/users", done: staffLogins > 0, figure: String(staffLogins) },
    { key: "attendance", title: "setup.step.attendance.title", hint: "setup.step.attendance.hint", href: "/admin/settings#attendance", done: saved.has("attendance") },
    { key: "bank", title: "setup.step.bank.title", hint: "setup.step.bank.hint", href: "/admin/settings#bank", done: Boolean(settings.bank.bankName && settings.bank.ifsc) },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, finished: Boolean(profile.setupCompletedAt) };
}
