# Progress & change log

What has changed, what was verified, what is pending. The module checklist is in [PLAN.md](./PLAN.md).

## Status at a glance

| # | Module | Status |
|---|---|---|
| 0 | Plan, scaffold, tooling | 🟢 Done |
| 1 | Core platform (tenancy & RLS, auth, access, approvals, audit, i18n, design system, shells) | 🟢 Done & verified |
| 2 | Platform console | 🟢 Done & verified |
| 3 | Organisation setup (checklist, profile, sections, posts, users & roles, settings, audit) + setup guide | 🟢 Done & verified |
| 4 | Employee master | 🟢 Done & verified (overview, leave and payslip tabs come with their modules) |
| 5 | Attendance & holidays | 🟢 Done & verified |
| 6 | Leave | 🟢 Done & verified |
| 7 | Payroll (rates & rules, monthly run, bank file, payslips) | 🟢 Done & verified |
| 8 | Pay changes, arrears, loans; suspensions, leaving service & settlement | 🟢 Done & verified |
| 9 | Statutory & tax (TDS, declarations, 24Q, Form 16, GPF, NPS, EPF, ESIC, calendar) | 🟢 Done & verified |
| 10 | Pension (pensioners, bills, life certificates, cases & PPO) | 🟢 Done & verified |
| 11 | Recruitment & onboarding | 🟢 Done & verified |
| 12–13 | Reports & dashboards, Ask | ⚪ Pending (Reports next) |

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
| Payroll, statutory and pension ported **together** (Modules 7–10) | The pay engine, TDS projection, GPF posting, settlements and the pension bill call each other; porting them one by one would have meant stubs in the engine |
| Signing codes tied to the item (`core/auth/sign.ts`) | A code sent for one pay bill cannot approve another; OTP limits count per purpose, so signing never blocks sign-in |
| Generated files are StoredFiles + a FileRecord register (`core/files`) | Same organisation wall as every upload; maker-checker release before download |

## Change log (newest first)

### 2026-11-23 — Module 11: recruitment and onboarding ✅
- Ported with its screens and wording: vacancies only against vacant sanctioned seats, applicants (one by one or
  Excel), selection, bilingual appointment letter, joining checklist, Employee ID and initial pay, probation tracker,
  PRAN and EPF / ESIC registration files, contract and daily-wage joining without a vacancy.
- **New in Kosh:** references are `<organisation code>/REC/<year>/<n>`; the letter carries the organisation's name,
  its service rules and the signing authority from Settings; joining uses the same Employee-login helper as every
  new employee (welcome SMS once the approval is saved). Demo: an advertised LDC vacancy with four applicants.
- Fixed for every screen: card header buttons could push a page wider than a phone; they now wrap.
- Tests: the original's recruitment flow test (vacancy → applicants → selection → letter → joining → ID → login) —
  333 tests in total, all passing. Verified in a browser as HR on a laptop and a phone.

### 2026-11-23 — Modules 7–10: payroll, pay changes and loans, statutory and tax, pension ✅
- Ported from the original and re-verified (≈12,000 lines of services, 170 screens and API routes, 27 tables): pay
  engine, five-stage monthly run and the simple three-step month, pre-checks, pay bill and prints, bank and return
  files, payslips (PDF, SMS, e-mail), increments, fixation, arrears and supplementary bills, loans; suspensions,
  leaving service and the full and final settlement; TDS projection, declarations, challans, Form 24Q, Form 16, GPF,
  NPS / EPF / ESIC / pension-fund files and the statutory calendar; pensioners, the pension bill, life certificates,
  dearness-relief arrears, deaths, retirement cases and the PPO.
- **New in Kosh:** signing codes bound to one pay bill; per-organisation SMS gateway and e-mail settings (keys stay in
  server variables); statutory settings per organisation (deductor, TAN, PAN, DDO, EPF, ESIC, metro HRA, professional
  tax slabs) with the organisation profile as fallback; PPO numbers, letterheads, payslips and statements carry the
  organisation's own code and name; PDFs in Kosh colours; a family pensioner's own login (no employee record) signs in
  to the pension view; `tenantOf()` also works on a transaction client. Starter pack v2: pay rates, pay heads,
  income-tax slabs (this and last year), statutory due dates, commutation table.
- Settings: *Tax and statutory numbers* became *Tax and statutory details*; the salary bank keeps only the last four
  digits of the debit account and offers an Excel or text file; new *SMS gateway* and *E-mail* cards.
- Tests: the original's payroll-engine, pre-check, pay-change, statutory, pension and simple-way unit tests and its
  payroll, pay-change, statutory, pension and simple-way integration tests run on the tenant-aware factory (pack parts
  installed with `installPack`) — 330 tests in total, all passing; the isolation test covers the 27 new tables.
- Seed: the DEMO organisation gets two closed months of payroll for every pay group, loans, GPF history, tax
  declarations, statutory filings, six pensioners (two with logins) with two closed pension bills, and a leaver
  whose settlement is ready to prepare.
- Verified in a browser: 24 payroll, tax and pension screens for the Admin, Accounts, an employee and a pensioner
  (phones for the last two) — no errors, no raw wording keys, nothing scrolls sideways; this month's salaries worked
  out (25 people, net ₹18,01,654), 5 flagged points decided, approved and paid, the Excel bank file downloaded, the
  month finished — payslips went out by SMS and e-mail with the organisation's name; the bulk payslip PDF checked.

### 2026-11-23 — Modules 5 and 6: attendance, holidays and leave ✅
- Ported together (the month lock treats an unexplained day as leave; approved leave marks attendance) with the
  original's rules, punch-file formats, screens and wording.
- **New in Kosh:** an installation-wide **device register** — a biometric device's serial number decides its
  organisation (a push arrives without anyone signed in); a serial belongs to one organisation only; devices of a
  paused organisation are refused. Starter pack: the central leave rules and the three fixed national holidays.
  Setup checklist: holidays and leave opening balances.
- Every ported table has real relations for its employee / section references, so the same-organisation keys cover
  them (porting tools in `scripts/port/`).
- Defaults changed to the central government's: office 09:00, 15 minutes' grace, Saturday and Sunday off.
- Fixed while porting: the approval page posted to a route named differently (`/decision`).
- Tests: the original's attendance-rule, punch-format and leave-rule unit tests and its attendance, leave and
  approvals integration tests now run on a tenant-aware factory — 207 tests in total, all passing.
- Verified in a browser: 22 attendance and leave screens for HR, a section head and an employee (phones for the
  last two) — no errors, nothing scrolls sideways; the section head approved a CL application (balance 8 → 6, both
  days marked as leave) and a missed-punch request (day regularised).

### 2026-11-23 — Module 4: employee master ✅
- Ported from the original and adapted to tenancy: records with encrypted identity numbers (per-organisation keys),
  family and nominees, documents (organisation-owned files), e-service book, change history, employee change
  requests, sanctioned posts, Excel bulk upload, scanned service books, the approval detail page.
- **New in Kosh:** every person gets their own Employee login when their ID is issued; Employee IDs are the
  organisation code + a running number; the platform's employee limit is enforced; office logins (not employees)
  count against the user limit; document types are a setting with defaults.
- **Isolation found and fixed:** a foreign key let organisation A store a family row pointing at B's employee (PostgreSQL
  checks foreign keys without RLS). `kosh_tenant_fks()` now gives every reference between tenant tables a
  same-organisation partner key, in every migration; a test fails if one is missing. Nothing of B was ever readable
  through it.
- Carried-over unit tests now run here too: validators, dates, money, pay matrix, access matrix (§14 cell by cell),
  access-state — 163 tests in total.
- Verified in a browser: list (25 demo staff), profile tabs, add employee in 4 steps (ID + login issued at once in the
  simple way), employee's own record and requests on a phone (nothing scrolls sideways), Excel template, an employee
  cannot open the list, another organisation's HR gets "not found" for a DEMO record id.

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
- [ ] Next.js 16.4.2 carries a published security advisory (seen in `next dev` and `next build`); upgrade together
      with the original repository.
- [ ] Employee profile Overview, Payslips and Leave tabs (C1, C1b) — with Module 12, which shares their summaries.
- [ ] An organisation logo on documents (today: the organisation's name; the platform's logo slot is empty).
- [ ] An e-mail (SMTP) connector for the platform console's sign-in codes in production (today: the message gateway).
