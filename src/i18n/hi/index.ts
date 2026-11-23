import { approvals, audit, loginType, org, permission, posts, profile, role, sections, settings, users } from "./admin";
import { auth } from "./auth";
import { common } from "./common";
import { attendance } from "./attendance";
import { employees } from "./employees";
import { leave } from "./leave";
import { errors, validation } from "./errors";
import { home, setup } from "./home";
import { my } from "./my";
import { nav } from "./nav";
import { moduleName } from "./modules";
import { platform } from "./platform";
import { payroll } from "./payroll";
import { pension } from "./pension";
import { statutory } from "./statutory";
import { rates } from "./rates";
import { files } from "./files";
import { easy } from "./easy";
import { recruitment } from "./recruitment";
import { reports } from "./reports";

/** Hindi — same areas and keys as English (tests/unit/i18n.test.ts). */
export const hi = {
  common,
  errors,
  validation,
  auth,
  nav,
  home,
  setup,
  permission,
  loginType,
  role,
  users,
  settings,
  org,
  sections,
  posts,
  audit,
  approvals,
  profile,
  platform,
  moduleName,
  employees,
  my,
  attendance,
  leave,
  payroll,
  pension,
  statutory,
  rates,
  files,
  easy,
  recruitment,
  reports,
};
