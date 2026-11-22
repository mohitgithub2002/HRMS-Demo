/**
 * The menu of a login, built from its rights and its organisation's modules (never from the login type alone).
 * Pure: the shell renders it, the tests check it. At most 8 top items; the Admin's tools sit under Administration.
 * Modules add their entries to MENU as they are built.
 */
import type { TKey } from "@/i18n";
import { can, canManageUsers, isFullAdmin, type Principal } from "./access";

export type MenuIcon = "home" | "inbox" | "users" | "briefcase" | "calendar" | "wallet" | "landmark" | "receipt" | "chart" | "settings" | "sparkles" | "user" | "shield";

export interface MenuItem {
  key: string;
  href: string;
  label: TKey;
  icon: MenuIcon;
  /** Shown as a small count (approvals waiting). */
  badge?: "approvals";
}

interface Entry extends MenuItem {
  show(p: Principal): boolean;
}

const MENU: Entry[] = [
  { key: "home", href: "/", label: "nav.home", icon: "home", show: () => true },
  { key: "approvals", href: "/approvals", label: "nav.approvals", icon: "inbox", badge: "approvals", show: (p) => p.loginType !== "EMPLOYEE" || p.permissions.includes("REPORTING_OFFICER") },
  { key: "admin", href: "/admin", label: "nav.admin", icon: "settings", show: (p) => isFullAdmin(p) || canManageUsers(p) || can(p, "audit_trail", "view") },
  { key: "profile", href: "/profile", label: "nav.profile", icon: "user", show: () => true },
];

export const MAX_TOP_ITEMS = 8;

export function menuFor(p: Principal): MenuItem[] {
  return MENU.filter((e) => e.show(p))
    .slice(0, MAX_TOP_ITEMS)
    .map(({ key, href, label, icon, badge }) => ({ key, href, label, icon, badge }));
}

/** The Administration page's tiles. */
export interface AdminTool {
  key: string;
  href: string;
  label: TKey;
  hint: TKey;
  icon: MenuIcon;
}

export function adminTools(p: Principal): AdminTool[] {
  const tools: (AdminTool & { show: boolean })[] = [
    { key: "setup", href: "/admin/setup", label: "nav.setup", hint: "setup.subtitle", icon: "sparkles", show: isFullAdmin(p) },
    { key: "organisation", href: "/admin/organisation", label: "nav.organisation", hint: "org.subtitle", icon: "landmark", show: canManageUsers(p) || isFullAdmin(p) },
    { key: "sections", href: "/admin/sections", label: "nav.sections", hint: "sections.subtitle", icon: "briefcase", show: canManageUsers(p) || isFullAdmin(p) || can(p, "employee_master", "create") },
    { key: "posts", href: "/admin/posts", label: "nav.posts", hint: "posts.subtitle", icon: "receipt", show: canManageUsers(p) || isFullAdmin(p) || can(p, "employee_master", "create") },
    { key: "users", href: "/admin/users", label: "nav.users", hint: "users.subtitle", icon: "users", show: canManageUsers(p) },
    { key: "settings", href: "/admin/settings", label: "nav.settings", hint: "settings.subtitle", icon: "settings", show: canManageUsers(p) },
    { key: "audit", href: "/admin/audit", label: "nav.audit", hint: "audit.subtitle", icon: "shield", show: can(p, "audit_trail", "view") },
  ];
  return tools.filter((t) => t.show).map(({ show: _show, ...t }) => t);
}
