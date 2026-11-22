import { approvals, audit, loginType, org, permission, posts, profile, role, sections, settings, users } from "./admin";
import { auth } from "./auth";
import { common } from "./common";
import { errors, validation } from "./errors";
import { home, setup } from "./home";
import { nav } from "./nav";
import { moduleName } from "./modules";
import { platform } from "./platform";

/** English — the source of every key. Each area lives in its own file; Hindi mirrors the same files. */
export const en = {
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
};
