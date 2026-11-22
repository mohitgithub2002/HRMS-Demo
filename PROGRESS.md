# Progress & change log

What has changed, what was verified, what is pending. The module checklist is in [PLAN.md](./PLAN.md).

## Status at a glance

| # | Module | Status |
|---|---|---|
| 0 | Plan, scaffold, tooling | 🟢 Done |
| 1 | Core platform (tenancy & RLS, auth, access, approvals, audit, i18n, design system, shells) | 🟢 Done & verified |
| 2 | Platform console | 🟢 Done & verified |
| 3 | Organisation setup (checklist, profile, sections, posts, users & roles, settings, audit) + setup guide | 🟢 Done & verified |
| 4 | Employee master | ⚪ Next |
| 5–13 | Attendance, leave, payroll, pay changes & loans, statutory, pension, recruitment, reports, Ask | ⚪ Pending |

🟢 Done & verified · 🟡 In progress · ⚪ Pending

---

## Decisions

| Decision | Why |
|---|---|
| **Pooled tenancy** (shared schema, `tenantId` everywhere), client resolved per tenant | Cheapest to run and upgrade; one function to route a large tenant to its own database later |
| **Row-level security + scoped client** (two walls) | RLS holds even if a query forgets its filter; the client's own filter holds even on a misconfigured role. Both are tested separately |
| `tenantId` defaults from `current_setting('app.tenant_id')` | Nested and bulk writes can never forget it; `WITH CHECK` refuses another tenant's id |
| Sessions bound to a tenant; separate platform sessions | Nothing a browser sends can change the organisation |
| HKDF per-tenant keys for Aadhaar / PAN / bank and duplicate hashes | A copied value is unreadable in another organisation; hashes reveal nothing across organisations |
| Modules per tenant narrow the access matrix | One place decides; menus, pages and APIs all follow |
| Starter packs as code (`src/platform/packs`), run in the provisioning transaction | A new organisation works from its first minute; all values stay editable |
| Setup checklist worked out from data | It can never claim a step is done when it is not |
| Same dependency versions as the original | Known to work together (Next 16.4.2, Prisma 7.10.1, React 19.2) |

## Change log (newest first)

### 2026-11-22 — Module 3: organisation setup and the setup guide ✅
- **Administration** page with the Admin's tools; **Setup** checklist (8 steps, each worked out from data, progress ring
  on Home until finished); **Organisation** profile with brand colour (used on the sign-in page); **Sections** and
  **Posts** (add, edit, switch off; weekly off per section); **Users & roles** (role cards in plain words, one-time
  passwords shown once, reset, switch off, the platform's user limit enforced, sessions ended on changes);
  **Settings** (way of working, sign-in, office hours, statutory numbers, salary bank, payslips — each card saves on
  its own); **Audit trail** (search; the IT support login sees system events only, never sensitive rows).
- `docs/SETUP-GUIDE.md` — install, create an organisation, first day, pay rules, people, attendance and leave, the
  first payroll, the monthly calendar, rights, troubleshooting. Chapters for modules still to come say so.
- `docs/ARCHITECTURE.md`, README with demo sign-ins.
- Verified in a browser: add a section, add a user with a role, save settings, the checklist moves 3 → 5 of 8; no page
  scrolls sideways at phone width; dark mode.
- Fixed: the brand mark lost its colours on phones (gradient ids shared with a hidden copy); OTP boxes cut a phone's
  SMS autofill to one digit.

### 2026-11-22 — Module 2: platform console ✅
- Console sign-in (email, password, code), overview, organisations list (search, status tabs), five-step creation
  wizard (details, modules, starter pack, first Admin, review), organisation page (modules, limits, pause / resume,
  new password for a locked-out Admin, activity), platform team, activity log.
- Verified end to end in a browser: create an organisation → its Admin signs in with the one-time password → must
  change it → Home; pausing the organisation signs the Admin out at once.

### 2026-11-22 — Module 1: core platform ✅
- RLS function `kosh_enable_rls()`, tenant-scoped client, platform client, per-tenant keys, sessions, OTP, access
  matrix with module gating, approvals engine (two steps + simple), audit (append-only trigger), outbox, settings
  store, REST wrappers, English + Hindi dictionaries, design system and shells, sign-in screens, Home, Approvals,
  My profile.
- Tests: isolation suite (8), scoped-client unit tests, module rules, dictionary parity — 17 passing.

## Pending / to confirm
- [ ] Next.js 16.4.2 carries a published security advisory (seen in `next dev`); upgrade together with the original
      repository.
- [ ] An e-mail (SMTP) connector for the platform console's sign-in codes in production (today: the message gateway).
