/**
 * Menus per login (§13): at most 8 items, built from the login's rights and its organisation's modules — never from
 * the login type alone. Pure module: icons are names; the shell turns them into components; tests check every menu.
 *
 * `BUILT` lists the screens that exist in this build; entries for screens still to come stay hidden, so menus grow
 * module by module without dead links.
 */
import type { TKey } from "@/i18n";
import type { ModuleKey } from "@/core/tenancy/modules";
import { can, canAll, canManageUsers, fnEnabled, isFullAdmin, rolesOf, type Principal } from "./access";

export type MenuIcon =
  | "home" | "inbox" | "users" | "briefcase" | "calendar" | "wallet" | "landmark" | "receipt" | "chart" | "settings"
  | "sparkles" | "user" | "shield" | "idcard" | "send" | "team" | "fingerprint" | "leaf" | "heart" | "grid" | "scale";

export interface MenuItem {
  key: string;
  href: string;
  label: TKey;
  icon: MenuIcon;
  /** Shown as a small count (approvals waiting). */
  badge?: "approvals";
}

type Rule = (p: Principal) => boolean;
interface Def extends MenuItem {
  show: Rule;
  module?: ModuleKey;
}

/** Screens that exist in this build (see the file comment). */
export const BUILT = new Set<string>([
  "/", "/approvals", "/admin", "/profile", "/employees", "/my/record", "/my/requests", "/attendance", "/leave", "/my/attendance", "/my/team",
  "/payroll", "/statutory", "/pension", "/my/payslips", "/my/pension-slips", "/my/life-certificate", "/recruitment", "/reports",
]);

const always: Rule = () => true;
const hasPerm = (...perms: string[]): Rule => (p) => p.permissions.some((x) => perms.includes(x));

const D = {
  home: { key: "home", href: "/", label: "nav.home", icon: "home" },
  approvals: { key: "approvals", href: "/approvals", label: "nav.approvals", icon: "inbox", badge: "approvals" },
  employees: { key: "employees", href: "/employees", label: "nav.employees", icon: "idcard" },
  recruitment: { key: "recruitment", href: "/recruitment", label: "nav.hiring", icon: "briefcase", module: "recruitment" },
  attendanceLeave: { key: "attendanceLeave", href: "/attendance", label: "nav.attendanceLeave", icon: "calendar", module: "attendance" },
  payroll: { key: "payroll", href: "/payroll", label: "nav.payroll", icon: "wallet", module: "payroll" },
  statutory: { key: "statutory", href: "/statutory", label: "nav.statutory", icon: "landmark", module: "statutory" },
  pension: { key: "pension", href: "/pension", label: "nav.pension", icon: "leaf", module: "pension" },
  reports: { key: "reports", href: "/reports", label: "nav.reports", icon: "chart", module: "reports" },
  admin: { key: "admin", href: "/admin", label: "nav.admin", icon: "grid" },
  payslips: { key: "payslips", href: "/my/payslips", label: "nav.myPay", icon: "receipt", module: "payroll" },
  leave: { key: "leave", href: "/leave", label: "nav.myLeave", icon: "calendar", module: "leave" },
  attendance: { key: "attendance", href: "/my/attendance", label: "nav.myAttendance", icon: "fingerprint", module: "attendance" },
  myRecord: { key: "myRecord", href: "/my/record", label: "nav.myRecord", icon: "user" },
  requests: { key: "requests", href: "/my/requests", label: "nav.myRequests", icon: "send" },
  myTeam: { key: "myTeam", href: "/my/team", label: "nav.myTeam", icon: "team" },
  pensionSlips: { key: "pensionSlips", href: "/my/pension-slips", label: "nav.pensionSlips", icon: "receipt", module: "pension" },
  lifeCertificate: { key: "lifeCertificate", href: "/my/life-certificate", label: "nav.lifeCertificate", icon: "heart", module: "pension" },
  profile: { key: "profile", href: "/profile", label: "nav.profile", icon: "user" },
} satisfies Record<string, Omit<Def, "show">>;

const ADMIN_MENU: Def[] = [
  { ...D.home, show: always },
  { ...D.approvals, show: hasPerm("APPROVER", "PAY_BILL_SIGNER") },
  { ...D.employees, show: (p) => can(p, "employee_master", "view") },
  { ...D.attendanceLeave, show: (p) => can(p, "attendance", "view") || can(p, "leave", "view") },
  { ...D.payroll, show: hasPerm("APPROVER", "PAY_BILL_SIGNER") },
  { ...D.pension, show: (p) => can(p, "pension", "view") },
  { ...D.reports, show: (p) => can(p, "reports", "view") },
];

/** The simple way: the Admin's menu is the organisation's work in the order of the month. */
const SIMPLE_ADMIN_MENU: Def[] = [
  { ...D.home, show: always },
  { ...D.approvals, show: always },
  { ...D.employees, show: always },
  { ...D.recruitment, show: always },
  { ...D.attendanceLeave, show: always },
  { ...D.payroll, show: always },
  { ...D.pension, show: always },
  { ...D.reports, show: always },
];

const HR_MENU: Def[] = [
  { ...D.home, show: always },
  { ...D.approvals, show: always },
  { ...D.employees, show: (p) => can(p, "employee_master", "view") },
  { ...D.recruitment, show: (p) => (p.simple ? canAll(p, "recruitment", "approve") : can(p, "recruitment", "view")) },
  { ...D.attendanceLeave, show: (p) => can(p, "attendance", "view") || can(p, "leave", "view") },
  { ...D.payroll, show: (p) => can(p, "payroll", "view") },
  { ...D.statutory, show: (p) => can(p, "statutory", "view") },
  { ...D.pension, show: (p) => can(p, "pension", "view") },
  { ...D.reports, show: (p) => can(p, "reports", "view") },
];

const EMPLOYEE_MENU: Def[] = [
  { ...D.home, show: always },
  { ...D.approvals, show: hasPerm("REPORTING_OFFICER") },
  { ...D.payslips, show: always },
  { ...D.leave, show: always },
  { ...D.attendance, show: always },
  { ...D.myRecord, show: always },
  { ...D.requests, show: always },
  { ...D.myTeam, show: hasPerm("REPORTING_OFFICER") },
];

const PENSIONER_MENU: Def[] = [
  { ...D.home, show: always },
  { ...D.pensionSlips, show: always },
  { ...D.lifeCertificate, show: always },
  { ...D.myRecord, show: always },
];

export const MAX_TOP_ITEMS = 8;

const visible = (p: Principal) => (d: Def) => BUILT.has(d.href) && (!d.module || !p.modules || p.modules.includes(d.module)) && d.show(p);
const strip = ({ key, href, label, icon, badge }: Def): MenuItem => ({ key, href, label, icon, ...(badge ? { badge } : {}) });

export function menuFor(p: Principal): MenuItem[] {
  let items: MenuItem[];
  if (p.loginType === "ADMIN") {
    const defs = p.simple && isFullAdmin(p) ? SIMPLE_ADMIN_MENU : ADMIN_MENU;
    const core = defs.filter(visible(p)).map(strip);
    // The Administration page holds the Admin's tools; it always takes one place.
    items = adminTools(p).length ? [...core.slice(0, MAX_TOP_ITEMS - 1), strip({ ...D.admin, show: always })] : core;
  } else if (p.loginType === "HR_ACCOUNTS") {
    items = HR_MENU.filter(visible(p)).map(strip);
    if (adminTools(p).length && items.length < MAX_TOP_ITEMS) items.push(strip({ ...D.admin, show: always }));
  } else {
    items = (rolesOf(p).includes("EMPLOYEE") ? EMPLOYEE_MENU : PENSIONER_MENU).filter(visible(p)).map(strip);
  }
  return items.slice(0, MAX_TOP_ITEMS);
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
  const structure = canManageUsers(p) || isFullAdmin(p) || can(p, "employee_master", "create");
  const tools: (AdminTool & { show: boolean })[] = [
    { key: "setup", href: "/admin/setup", label: "nav.setup", hint: "setup.subtitle", icon: "sparkles", show: isFullAdmin(p) },
    { key: "organisation", href: "/admin/organisation", label: "nav.organisation", hint: "org.subtitle", icon: "landmark", show: canManageUsers(p) || isFullAdmin(p) },
    { key: "sections", href: "/admin/sections", label: "nav.sections", hint: "sections.subtitle", icon: "briefcase", show: structure },
    { key: "posts", href: "/admin/posts", label: "nav.posts", hint: "posts.subtitle", icon: "receipt", show: structure },
    { key: "users", href: "/admin/users", label: "nav.users", hint: "users.subtitle", icon: "users", show: canManageUsers(p) },
    { key: "settings", href: "/admin/settings", label: "nav.settings", hint: "settings.subtitle", icon: "settings", show: canManageUsers(p) },
    { key: "rates", href: "/admin/rates", label: "nav.rates", hint: "rates.subtitle", icon: "scale", show: fnEnabled(p, "payroll") && (p.simple && isFullAdmin(p) ? true : can(p, "rates_rules", "approve") || can(p, "rates_rules", "create")) },
    { key: "statutory", href: "/statutory", label: "nav.statutory", hint: "statutory.subtitle", icon: "landmark", show: fnEnabled(p, "statutory") && p.loginType === "ADMIN" && can(p, "statutory", "view") },
    { key: "audit", href: "/admin/audit", label: "nav.audit", hint: "audit.subtitle", icon: "shield", show: can(p, "audit_trail", "view") },
  ];
  return tools.filter((t) => t.show).map(({ show: _show, ...t }) => t);
}

/** Whether a login has an approvals inbox worth showing on Home (it decides something, or raises things that are decided). */
export function hasApprovalsInbox(p: Principal): boolean {
  if (p.simple && isFullAdmin(p)) return true;
  return p.permissions.some((x) => ["APPROVER", "PAY_BILL_SIGNER", "CHECKER", "REPORTING_OFFICER", "HR", "PAYROLL", "PENSION"].includes(x));
}
