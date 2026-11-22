import { approvals, audit, loginType, org, permission, posts, profile, role, sections, settings, users } from "./admin";
import { auth } from "./auth";
import { common } from "./common";
import { errors, validation } from "./errors";
import { home, setup } from "./home";
import { nav } from "./nav";
import { platform } from "./platform";

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
};
