# Kosh HRMS Cloud — Multi-tenant build plan

Kosh is the multi-tenant edition of the DCB HRMS & Payroll system (`mohitgithub2002/HRMS-Payroll-System`). One
installation serves many organisations — Cantonment Boards, municipal bodies, government undertakings and the
companies that work like them — each with its own employees, pay rules, approvals and files, and none able to see
another's.

It is a new codebase, designed for tenants from the first line. The proven, tested business rules of the original
(pay engine, tax, GPF, pension, attendance and leave rules, money and date helpers) are carried over as pure
modules and re-verified with their worked examples; everything around them — data model, sessions, permissions,
screens, provisioning — is built new.

Progress and decisions: [PROGRESS.md](./PROGRESS.md). Setting up an organisation: [docs/SETUP-GUIDE.md](./docs/SETUP-GUIDE.md).

**Legend:** `[x]` done and verified · `[~]` partly done (see note) · `[ ]` pending

---

## 1. Who uses it

| Who | Where | What they do |
|---|---|---|
| **Platform owner** (super-admin) | `/platform` — its own sign-in, its own users | Creates organisations, chooses their modules and limits, suspends or reactivates them, sees usage and health, reads the platform audit trail. Never sees an organisation's people or pay. |
| **Organisation Admin** | the organisation's app | Finishes the guided setup, manages users, settings, approvals, sees everything in the organisation. |
| **HR manager / Accounts manager / Checker / Section head** | the organisation's app | The desks of the original system (HR, Payroll, Pension, Checker, Reporting officer). |
| **Employee / Pensioner** | the organisation's app, phone first | Own record, attendance, leave, payslips, tax, pension slips. |

## 2. Architecture

### 2.1 Stack

| Concern | Choice | Why |
|---|---|---|
| App | Next.js 16 (App Router) + TypeScript strict | One codebase for screens and REST API; runs on Vercel or a VM |
| Data | PostgreSQL 16 + Prisma 7 (driver adapter `pg`) | Row-level security, JSON, dated tables |
| UI | Tailwind CSS v4, own component kit, lucide icons | Premium look without a heavy UI library |
| Type | Inter (interface), Fraunces (display), Noto Sans Devanagari (Hindi) — self-hosted | Elegant, legible, no outside font CDN |
| Tests | Vitest (unit + database integration incl. tenant isolation), Playwright (browser) | — |

### 2.2 Tenancy model — pooled by default, silo-ready

All organisations share one database and one schema; every business row carries `tenantId`. This is the cheapest
model to run and to upgrade (one migration for everyone). The database client is resolved **per tenant** in one
function (`tenantDb(tenantId)`), so a very large organisation can later be moved to its own database (silo) by
adding a connection to its tenant record — the schema is the same, nothing else changes.

### 2.3 Isolation — five walls

1. **The session decides the tenant.** A sign-in is always for one organisation (organisation code + user ID). The
   session row stores the `tenantId`; nothing in a URL, form or header can change it. Platform sessions are a
   different table and a different cookie.
2. **PostgreSQL row-level security on every tenant table** (`FORCE ROW LEVEL SECURITY`, so even the table owner
   obeys). The policy compares `tenantId` with `current_setting('app.tenant_id')`, which the app sets inside the
   transaction of every query. A query that forgot a filter still sees only its own organisation. New rows take
   `tenantId` from the same setting by default, and `WITH CHECK` refuses a row for another organisation.
3. **A tenant-scoped database client** (`core/tenancy/scoped-db.ts`) adds `tenantId` to every `where` and every
   `data` as well — a second wall that holds even if the database role were misconfigured. Modules never import the
   raw client; a lint rule enforces it. The app refuses to start in production if its database role can bypass RLS.
4. **Keys per organisation.** Aadhaar, PAN and bank numbers are encrypted (AES-256-GCM) with a key derived from the
   master key and the tenant id (HKDF); duplicate-finding hashes are per tenant too. A row copied into another
   organisation cannot be read there.
5. **Files, limits and logs per organisation.** Stored files live under the tenant's prefix and are read only
   through its scoped client; rate limits and the audit trail are kept per tenant.

Isolation is tested: `tests/integration/isolation.test.ts` creates two organisations and proves that reads,
updates, deletes, raw queries, files and sign-ins of one never reach the other — with the scoped client and with
RLS alone.

### 2.4 Layers and folders

```
prisma/                       schema, migrations (RLS policies included), seed (platform owner + demo tenants)
src/core/                     platform-neutral building blocks
  tenancy/                    tenantDb(), scoped client, RLS context, tenant resolution, platform client
  auth/                       sessions, OTP, passwords, access matrix (§14 as data), roles, menus
  approvals/                  maker-checker engine + the simple way (direct approval)
  audit.ts outbox.ts errors.ts money.ts dates.ts crypto.ts env.ts storage.ts i18n/ api/
src/platform/                 the platform console's services: tenants, provisioning, packs, usage, platform users
src/modules/<module>/         business rules and permission checks, one folder per module (pure rules separate)
src/app/(auth)/               sign-in (organisation code, ID, password, OTP)
src/app/(app)/                the organisation's screens
src/app/platform/             the platform console
src/app/api/v1/               REST API for the organisation app (thin wrappers over services)
src/app/api/platform/         REST API for the console
src/components/ui|shell/      design system and shells
docs/                         SETUP-GUIDE.md, ARCHITECTURE.md, DEPLOYMENT.md
```

Every service takes a **context** `{ tenantId, db, actor, meta }`; every write records an audit row and an outbox
event in the same transaction.

### 2.5 Provisioning and packs

Creating an organisation is one transaction (`platform/provision.ts`): the tenant row, its settings, the first
Admin login with a one-time password, and a **starter pack** of masters copied into the tenant:

- *Government of India — 7th CPC* (default): pay matrix, DA / HRA / TA rates, statutory rates (NPS, GPF, GIS, EPF,
  ESIC, pension fund), pay heads, leave types, income-tax slabs (both regimes), statutory due dates, pension tables,
  document types, standard sections and posts.
- *Empty*: only the settings, for organisations that will enter everything themselves.

Every pack value stays editable by the organisation (dated, through its own approvals). Packs are code
(`platform/packs/*`), versioned and unit-tested.

### 2.6 Modules per organisation

Each tenant has a list of enabled modules (Employees and Settings are always on): Recruitment, Attendance, Leave,
Payroll, Loans & arrears, Statutory & tax, Pension, Reports, Ask AI. Menus, screens and APIs check it, so an
organisation without pensioners never sees Pension.

### 2.7 Two ways of working (per organisation)

**Simple** (default): Admin, HR manager and Accounts manager each decide on their desk; entries count at once;
payroll in three steps. **Two steps**: the PRD's maker-checker with Checker and Admin approvals and OTP-signed pay
bills. The same permissions serve both.

---

## 3. Build order

Each module is shipped as commits that work on their own: typecheck, lint, tests and build green, screens checked
in a browser, rows ticked here.

| # | Module | Status |
|---|---|---|
| 0 | Plan, scaffold, tooling | [x] |
| 1 | Core platform: tenancy & RLS, auth, access matrix, audit, outbox, approvals, i18n, design system, shells | [x] |
| 2 | Platform console: organisations, provisioning with packs, modules, suspend, platform users, usage, audit | [x] |
| 3 | Organisation setup: guided setup checklist, organisation profile, sections, posts, users & roles, settings; setup guide | [x] |
| 4 | Employee master: records, IDs, family & nominees, documents, service book, change requests, sanctioned posts, bulk upload | [x] |
| 5 | Attendance & holidays: punch imports, muster, daily status, requests, month lock, today board | [x] |
| 6 | Leave: rules, credits, apply & decide, ledger, opening balances | [x] |
| 7 | Payroll: rates & rules, pay items, monthly run (pre-checks, stages), pay bill, bank file, payslips | [x] |
| 8 | Pay changes, arrears, loans & advances | [x] |
| 9 | Statutory & tax: GPF, NPS, EPF, ESIC, TDS projection, declarations, 24Q, Form 16, calendar | [x] |
| 10 | Pension: pensioners, pension bill, life certificates, cases & PPO | [x] |
| 11 | Recruitment & onboarding | [x] |
| 12 | Reports & dashboards | [x] |
| 13 | Ask AI (per organisation, within each login's rights) | [x] |

**Definition of done for each module:** data model + migration with RLS; services with permission checks and
tenant context; REST API; screens in English and Hindi that work on a phone; audit + outbox on every write;
unit tests for every rule, an isolation test for every new table; checks green.

---

## 4. Module checklists

### Module 1 — Core platform
- [x] Tenant-scoped client + RLS policies generated for every table that has `tenantId`; default `tenantId` from the
      transaction setting; platform client for console work; production start-up refuses a role that bypasses RLS
- [x] Per-tenant encryption and blind-index keys (HKDF); OTP pepper
- [x] Sessions bound to one tenant (cookie `kosh_session`), 15-minute idle timeout, password + OTP sign-in,
      mobile + OTP for employees, lock after 5 wrong passwords, OTP limits
- [x] Access matrix (§14 as data) + simple roles; menus built from rights and the tenant's modules (≤ 8 items)
- [x] Audit trail (append-only trigger), outbox, approvals engine (two steps) + direct approval (simple)
- [x] REST wrapper: session, tenant, same-origin check, rate limits per tenant, Zod validation, translated errors
- [x] i18n English + Hindi with a parity test; money (paise, rupee rounding, words); dates (India time)
- [x] Design system: tokens (light + dark), Button, Input, Select, Textarea, Checkbox, Card, Badge, Tabs, Table
      (stacks to cards on a phone), Dialog, Toast, EmptyState, PageHeader, StatTile, Stepper, Skeleton, Avatar
- [x] App shell: sidebar with brand, organisation switcher label, search, Ask button, language, profile; phone bottom bar
- [x] Sign-in screen with organisation code (remembered), branded per organisation via `/o/<code>`

### Module 2 — Platform console
- [x] Platform users (owner, support) with password + OTP; own session cookie; own audit trail
- [x] Organisations list: status, plan, modules, users, employees, last activity; search and filter
- [x] Create organisation wizard: details → code → modules → pack → first Admin → review; one transaction; the
      Admin's one-time password shown once
- [x] Organisation page: profile, status (trial / active / suspended / closed), modules, limits (users, employees),
      usage, reset the first Admin's password, audit
- [x] Suspending stops every sign-in and session of that organisation at once
- [x] Platform dashboard: organisations by status, active users today, employees, payroll runs this month

### Module 3 — Organisation setup
- [x] Setup checklist on the Admin's Home until done: each step shows its state from the data and links to its screen
- [x] Organisation profile (names in English and Hindi, address, logo, TAN, DDO code, PF/ESIC codes)
- [x] Sections (departments) and posts (designations, pay level, group, retirement age)
- [x] Users & roles (simple roles or ticked permissions), password resets, disabling
- [x] Settings: way of working, attendance times, lock day, weekly off, bank format, SMS/email, document types
- [x] docs/SETUP-GUIDE.md — the complete first-day-to-first-payroll guide

### Module 4 — Employee master (§4)
- [x] EM-01 One record per person, unique Employee ID per organisation (organisation code + running number); types Permanent-OPS, Permanent-NPS, Contract, Daily wage, Re-employed, Deputation
- [x] EM-02 Job details; date of retirement worked out from the post's age (born on the 1st → previous month end) and recalculated on change
- [x] EM-03 PAN, Aadhaar (Verhoeff), PRAN/UAN/ESIC, bank + IFSC — encrypted with the organisation's own key, masked, duplicates blocked within the organisation (at entry, at approval and by index)
- [x] EM-04 Family and nominees per scheme (shares add to 100%)
- [x] EM-05 Documents (PDF/JPG/PNG, recognised by content, size per document type, SHA-256), stored as the organisation's own files
- [x] EM-06 e-Service book with orders; appointment / promotion / penalty also go to an Admin in the two-step way
- [x] EM-07 Changes through a Checker (two steps) or at once (simple); every old value kept in the history
- [x] EM-08 Employee change requests (address, mobile, bank, nominee); withdraw while waiting
- [x] EM-09 Sanctioned vs filled posts per section and post
- [x] EM-10 Bulk upload from the organisation's own Excel template (codes sheet), row-level checks, all-or-nothing, one approval issues IDs
- [x] Every person on the rolls gets their own Employee login when their ID is issued (Employee ID; mobile + code) — new in Kosh
- [x] The platform's employee limit is enforced on single and bulk entries — new in Kosh
- [x] Screens: Employees list (search, filters), profile (Personal · Job & Pay · Bank & IDs · Family · Documents · Service book · History), edit, add (4 steps), bulk upload, sanctioned posts, change requests, scanned service books; My record and My requests for employees
- [ ] Overview tab, Leave and Payslips tabs on the profile — with Modules 6–7; suspension and leaving service — with Module 8

### Module 5 — Attendance & holidays (§6)
- [x] AT-01 Punch files (eSSL, ZKTeco, Mantra, AEBAS, own template) checked line by line before saving; files kept as the organisation's own; device push (`/iclock`) — the device's serial number finds its organisation through the installation-wide device register (new in Kosh), devices of a paused organisation are refused
- [x] AT-02 Muster roll and HR corrections, sent as one batch
- [x] AT-03 Daily status worked out from the rules (office start, grace, half-day minutes are settings; defaults are the central government's: 09:00, 15 minutes, Saturday and Sunday off)
- [x] AT-04 Missed-punch / on-duty requests decided by the section head
- [x] AT-05 Month lock with every exception decided (present, on duty, dies-non, treat as leave); totals frozen for payroll; reopening through a Checker
- [x] AT-06 Days worked for contract and daily-wage staff
- [x] AT-07 Today board by section
- [x] AT-08 Holiday calendar per year (the starter pack adds the three fixed national holidays for this year and next); weekly off and attendance mode per section
- [x] Screens: Attendance (Today · Register · Lock · Requests · Import), Holidays, My attendance, My team

### Module 6 — Leave (§7)
- [x] LV-01 Leave rules table (starter pack: the central rules), changes through an Admin
- [x] LV-02 Automatic credits once per person per period (checked once a day per organisation), pro-rata for joiners
- [x] LV-03 Apply with a live preview, approve / reject / send back, withdraw, cancel
- [x] LV-04 Approved leave marks attendance; half-pay and no-pay leave carried to the month totals
- [x] LV-05 HR enters leave sanctioned on paper
- [x] LV-06 Opening balances from Excel through a Checker
- [x] LV-07 Leave account per employee on screen and as a bilingual PDF
- [x] Screens: Leave (mine), Apply, Team leave, Leave management (applications, balances, enter, opening, rules), application page, ledger

### Module 7 — Rates & rules + monthly payroll (§8)
- [x] PR-01 7th CPC pay matrix as a dated table (level × cell); a new commission matrix can be added with a new date (Excel upload → Admin approves)
- [x] PR-02 DA / HRA / TA dated rate table: DA 60% from 1 Jan 2026, HRA 30% (X city; Y / Z rates kept), TA by level with DA on TA — plus the statutory rates (NPS, GPF, GIS, EPF, ESIC, pension fund)
- [x] PR-03 Pay heads master (Basic, DA, HRA, TA, NPA, special, washing, uniform, conservancy, risk…) each with formula + account head; changes and new heads through an Admin, versioned
- [x] PR-04 Deductions: GPF/CPF, NPS 10%, income tax, group insurance, licence fee, loans, court attachment, society dues, overpayment recovery — standing amounts per person as pay items, checked by a Checker
- [x] PR-05 Pay groups: Permanent-OPS (with deputation), Permanent-NPS, Contract & daily wage (with re-employed) — _the Pensioners group runs the pension bill (Module 10)_
- [x] PR-10 Pre-checks: no bank account, negative net, pay after retirement (or contract end), net change > 25%, duplicate bank account — plus no pay level, suspension and last month's attendance not locked
- [x] PR-11 Pay bill, schedules, acquittance roll, salary register as bilingual PDFs — _layouts to be matched to each organisation's printed formats_
- [x] PR-12 Bank file in the bank's format (generic, SBI CMP, PNB, BoB, Canara) through the file registry; return file of failed credits read; re-pay file
- [x] PR-13 Reopen only by Admin with a reason, only before bank file release
- [x] PR-14 Accounting summary by account head for the accounts system (balanced debit / credit CSV at month close, through the file registry)
- [x] S-81 Rates & rules (HR proposes, Admin approves, effective dates)
- [x] S-40 Payroll month — five stages: Run → Fix exceptions → Check → Approve & sign (OTP) → Pay
- [x] Pay items screen (standing allowances and deductions per person) · pay sheet per person · Home tile (pay groups approved this month) · approvals inbox opens the payroll to decide
- [x] Worked example passes exactly: L6 C1 NPS (X city) → gross ₹73,020, NPS ₹5,664
- [x] Full payroll run under 30 minutes (§16) — a pay group works out in well under a second for the demo organisation

### Module 8 — Pay changes, arrears, loans & salary slips (§8)
- [x] PR-06 Increment due list on 1 Jan / 1 Jul (six months in the level; own record cannot be ticked; leave without pay flagged); HR & Accounts confirm, Checker verifies, pay history + service book updated, a future date waits for its day
- [x] PR-07 Pay fixation on promotion / MACP with the rule shown on screen — both options (from promotion / from the next increment date), Checker then Admin
- [x] PR-08 Arrears "due vs drawn" for any back period (rates, increments, fixation), month by month, paid in a supplementary bill that goes through the same five stages; also bills for pay withheld earlier and for joiners
- [x] PR-09 Loans & advances: sanction (Checker + Admin), schedule, simple interest after the principal, recovery through payroll recorded on approval and undone on reopen, stops at zero
- [x] SL-01 PDF payslip: the organisation's name, Employee ID, post, level & cell, bank last 4, PAN masked
- [x] SL-02 Earnings, deductions, net in figures and words; leave balance; NPS to date and GPF this year from the pay bills — _full GPF / NPS ledgers with interest in Module 9_
- [x] SL-03 Hindi and English versions
- [x] SL-04 Email (PDF attached, the organisation's SMTP (Settings → E-mail)) + SMS link on credit day (bank file released); employee downloads any past month (2 taps on phone)
- [x] SL-05 Bulk download for a bill or one section as one PDF
- [x] S-41 Increments & fixation · S-42 Arrears & supplementary bills · S-43 Loans · S-44 Payslips (HR & Accounts and My payslips)

### Module 9 — Statutory & tax (§9)
- [x] GPF ledger (min 6%, annual cap ₹5 lakh, advances, withdrawals, interest, annual statement) — _GPF final payment on retirement in Module 10_
- [x] NPS employee 10% + employer share, CRA contribution file, CRA statement reconciliation
- [x] Organisation pension fund 10% employer contribution for OPS staff (CBAR 2020)
- [x] EPF 12% + 12% with ₹15,000 ceiling, EPS split, ECR file
- [x] ESIC employee/employer shares, monthly contribution file
- [x] Professional tax switch with monthly slabs (per state)
- [x] ST-01 Rates, ceilings and due dates as dated, editable tables
- [x] ST-02 Tax regime per employee per year (new regime default)
- [x] ST-03 Investment declarations + proofs before January, verified by HR & Accounts
- [x] ST-04 Monthly TDS projected on full-year income, adjusted monthly and in Q4
- [x] ST-05 Challan details against each month's TDS
- [x] ST-06 Form 24Q quarterly file (Protean / TRACES FVU) — _layout to be run through the FVU before the first filing (to confirm per organisation)_
- [x] ST-07 Form 16 Part B generated; Part A imported; both published to employee
- [x] ST-08 Statutory calendar on dashboard, reminders 5 days before due
- [x] ST-09 Every file previewed, Admin-approved, logged with checksum
- [x] S-50 GPF & NPS · S-51 Tax declarations · S-52 Statutory files · S-53 Form 16

### Module 10 — Pension (§10)
- [x] PN-01 Pensioner record: PPO, type, basic pension, commuted amount & date, DOB, bank, family — _additions from the old records and every change go to a Checker_
- [x] PN-02 Pension payroll: basic + DR (= DA rate) + fixed medical allowance − commutation; same five stages — _pay group "Pensioners": OTP approval, bank file to the pensioner's account by PPO, prints, close; months not yet paid here are caught up on the next slip; TDS on own pension_
- [x] PN-03 Commuted portion restored after 15 years automatically — _by days in the month of restoration; 29 Feb → 1 Mar_
- [x] PN-04 Additional pension at 80 and later slabs — _from the 1st of the month of turning 80 / 85 / 90 / 95 / 100, on basic pension, DR on both_
- [x] PN-05 DR change → arrears for all pensioners in one job — _due vs drawn for the months paid, one supplementary pension bill_
- [x] PN-06 Life certificate status (manual / Jeevan Pramaan upload), SMS reminder, pension held after one month overdue — _November cycle; upload checked by Pension in Approvals; the bill holds by itself and pays the held months next time_
- [x] PN-07 Retirement alerts at 12 and 6 months; no-dues checklist per section — _alerts on the case screen and in Home "My work"; dues recovered from the benefits_
- [x] PN-08 New pension case calculator: qualifying service, emoluments, pension, commutation, gratuity, leave encashment, GPF final, family pension — _from the service book, approved pay bills, leave ledger, GPF ledger; NPS staff: gratuity and leave encashment_
- [x] PN-09 Case prepared (Pension), checked (Checker), approved (Admin); PPO PDF — _bilingual PPO stored at approval for physical signature_
- [x] PN-10 Retiree moves to pensioner group the day after retirement; gratuity, commutation, encashment in supplementary bill — _leaves the rolls (status, service book), GPF account closed_
- [x] PN-11 Death: pension stops, family pension next day, overpayment recovered — _pensioner or employee in service; recovery from family pension (≤ ⅓ a month) or from the benefits_
- [x] PN-12 Pension slip by SMS / email; pensioner login with mobile + OTP — _retirees keep their login; family pensioners get their own; Home, slips, life certificate, record_
- [x] All formulas as editable tables (pension %, commutation factors, gratuity, slab ages) — _dated rates (Pension group) + dated commutation table through Admin approval_
- [x] S-60 Pensioners · S-61 Pension payroll · S-62 Pension case & PPO

**Carried over with the pay core (the original's client add-ons):**
- [x] C2 Suspension and leaving service (resignation, removal, dismissal, termination, contract end, transfer out) with a full and final settlement that takes every outstanding loan and recovery — _HR records with the order, Checker + Admin approve; reinstatement the same; the statement (withheld pay, leave encashment by kind of leaving, every loan with interest, pay drawn after the last day, instalments still to come, lines by order) goes to a Checker and an Admin; the net is paid by a settlement bill whose approval closes the loans and the GPF account, or the person pays back the excess receipt by receipt; statement PDF_
- [x] C3 Arrears of a DA rate / increment paid late, worked out by days when the change falls inside a month
- [x] C4 DA and transport allowance (with DA on it) year by year, with each revision's step
- [x] C6 Bank salary file as Excel (text file kept as a setting)
- [x] C3a A back-dated promotion, MACP or increment works out the increments recorded after it again (or withdraws them)
- [x] C2a Leaving mid-month with a loan: a pre-check asks Payroll to hold the last pay (the settlement recovers the loan from it) or explain why it is paid

**New in Kosh for Modules 7–10:**
- [x] Every service reads through the organisation's own client; the 27 new tables carry `tenantId`, RLS and same-organisation keys (the isolation test covers them automatically)
- [x] Outgoing files (bank, return, statutory, Form 16, PPO) are StoredFiles of the organisation, registered and released through maker-checker (`core/files`)
- [x] Pay bills are signed with a one-time code tied to that bill (`core/auth/sign.ts`); a code for one bill cannot sign another
- [x] SMS and e-mail per organisation (Settings → SMS gateway, E-mail); texts carry the organisation's name, keys stay in server variables
- [x] Statutory settings per organisation (deductor, TAN, PAN, DDO, EPF, ESIC, metro HRA, professional tax slabs); deductor name and address fall back to the organisation profile
- [x] PPO numbers start with the organisation's code; letterheads, payslips and statements carry the organisation's name
- [x] Starter pack: dated pay rates, pay heads, income-tax slabs (this and last year), statutory due dates, commutation table
- [x] A family pensioner's own login (no employee record) signs in to the pension view
- [x] Employee profile Overview, Payslips and Leave tabs (C1, C1b) — landed with Module 12

### Module 11 — Recruitment & onboarding (§5)
- [x] RO-01 Vacancy only against a vacant sanctioned post (seats ≤ sanctioned − filled − open vacancies − joinings in progress); Admin approves before advertising
- [x] RO-02 Vacancy: post, level, seats, reservation break-up (must add up to the seats), advert no. & date, last date; reference `<organisation code>/REC/YYYY/NNN`
- [x] RO-03 Applicants one by one or Excel import (template, row-level errors); Applied → Eligible → Shortlisted → Selected → Waitlisted → Rejected; marks and merit rank recorded (exam is outside the system)
- [x] RO-04 Selection list (≤ seats, General-category selections ≤ unreserved seats) approved by Admin; appointment letter from template, Hindi page + English page, numbered `<ref>/APT/NN`, print audited
- [x] RO-05 Joining checklist: documents, medical, police verification, oath, bank, PAN, Aadhaar consent — each ticked by name and date, with an optional attached document
- [x] RO-06 "Complete joining" issues the Employee ID and fixes initial pay (level, cell 1) — _the pro-rata salary from the date of joining is worked out by the payroll run (Module 7), which reads the DOJ_
- [x] RO-07 NPS (PRAN) registration data file for NPS joiners without a PRAN; EPF/ESIC registration file for contract / daily-wage joiners without UAN/ESIC — both through the file registry (preview → Admin approves → checksum → download)
- [x] RO-08 Probation tracker (2 years − 1 day for direct recruits), alert 30 days before end on Home and in the list; confirmation recorded into the service book through the Checker
- [x] RO-09 Contract / daily-wage onboarding without vacancy (agency, wage rate and basis, contract dates)
- [x] Flow: Checker verifies documents & initial pay → Employee ID issued → APPOINTMENT entry in the service book → Employee login created → welcome SMS
- [x] S-20 Vacancies · S-21 Applicants & selection · S-22 Joining (+ Probation and Registration files tabs); applicant and list tables become cards on a phone
- [x] Kosh: the joining approval uses the shared Employee-login helper (same as every new employee); the appointment letter carries the organisation's name, service rules and the signing authority from Settings

### Module 12 — Reports & dashboards (§11)
- [x] Dashboards per login — Admin: headcount by type, salary and pension cost, payroll stage, approvals, retirements in 6 months, statutory due dates; HR & Accounts: My work, locks open, payroll exceptions, leave waiting, joiners / leavers, life certificates overdue; Employee: last net pay, leave balance, next increment, requests waiting; Pensioner: last pension, life certificate. In the simple way, each desk gets its quick actions and its four first figures
- [x] 25 standard reports, filter by month, section, employee type; Excel + PDF export — open to a login with Reports **and** the view right of what the report reads (§14); reporting officers see their own section; every download audited; payroll reports read approved bills only
- [x] Report 25 ghost-employee check — and, new in Kosh, the database refuses a second current employee with the same PAN, Aadhaar or bank account in the same organisation (partial unique indexes, as in the original)
- [x] Employee profile Overview (month / financial-year view), Leave and Payslips tabs; the suspension / leaving banner and "Record suspension or leaving" on the profile (C1, C1b, C2)
- [ ] Migration console for the original client's FoxPro data — not carried over: each new organisation loads its people with the Excel bulk upload, opening leave balances and GPF openings instead
- [ ] Full data export per organisation (CSV / JSON) — with the platform console's organisation page

### Module 13 — Ask AI (questions in plain words)
_Goal: a person asks in their own words and gets an answer from the records and the organisation's documents — and only ever what their login may already see._
- [x] A1 Ask screen for every login (a button above the menu, and in the top bar on a phone): suggested questions by role, the answer as it is written, the rows behind a list (CSV), "How this was worked out" with each look-up and its query; English and Hindi; phone layout
- [x] A2 Answers from the records by SQL the model writes — over 52 views of a separate schema, never the tables
- [x] A3 Access: each login's reach per area from the §14 matrix (whole organisation / own section / own record / nothing), in both ways of working; the User & settings manager never gets people or pay; identity and account numbers are in no view
- [x] A4 Three walls: the guard (PostgreSQL's own parser, allowlists), a read-only database role that can read only the views, views that filter their rows from a short-lived pass — the last two hold even if the first were wrong (tested)
- [x] A5 The organisation's documents (policies, orders, circulars) as text with an audience each — everyone, office staff, Admin; written by the Admin (and the HR manager in the simple way); audited
- [x] A6 Settings → Ask: off / office staff / everyone; every question in the audit trail with its statements (not the rows); 30 questions per person in 10 minutes
- [x] A7 The AI service is each organisation's choice in Settings → Ask: **Gemini (the default)**, GPT or Claude, each with its model name and its own API key — saved encrypted, never shown again, or taken from the server's environment; a Test button says whether the key and model work
- [~] A7a Each service's adapter is tested through its official SDK against a local stand-in for the service — _a run with a real key is still to do (none was available while building): Settings → Ask → Test, then the suggested questions_
- [ ] A8 Each organisation decides whether records may be sent to an AI service outside its servers (its own policy) before Ask is switched on in production
- [x] Kosh: a fourth wall — each statement's transaction sets the organisation for row-level security on every table the views read, and the pass must belong to that same organisation; tested: an Admin with full reach sees nothing of another organisation, even with that organisation's live pass token
- [x] Kosh: Ask is a platform add-on module (switched on per organisation in the console) and starts "off" in Settings until the organisation has chosen its service and key; keys are encrypted with the organisation's own key
- [x] Kosh: one read-only role for the installation (`kosh_ask`), created by the migration or once by an administrator (`scripts/ask-role.sql`)

Feature lists follow the original's PLAN (RO-, reports, Ask rows) and are copied here, row by row, when each module
starts, so each is ticked against the same requirement IDs.
