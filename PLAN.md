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
| 4 | Employee master: records, IDs, family & nominees, documents, service book, change requests, sanctioned posts, bulk upload | [ ] |
| 5 | Attendance & holidays: punch imports, muster, daily status, requests, month lock, today board | [ ] |
| 6 | Leave: rules, credits, apply & decide, ledger, opening balances | [ ] |
| 7 | Payroll: rates & rules, pay items, monthly run (pre-checks, stages), pay bill, bank file, payslips | [ ] |
| 8 | Pay changes, arrears, loans & advances | [ ] |
| 9 | Statutory & tax: GPF, NPS, EPF, ESIC, TDS projection, declarations, 24Q, Form 16, calendar | [ ] |
| 10 | Pension: pensioners, pension bill, life certificates, cases & PPO | [ ] |
| 11 | Recruitment & onboarding | [ ] |
| 12 | Reports & dashboards | [ ] |
| 13 | Ask AI (per organisation, within each login's rights) | [ ] |

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

### Modules 4–13
Feature lists follow the original's PLAN (EM-, RO-, AT-, LV-, PR-, SL-, ST-, PN- rows) and are copied here, row by
row, when each module starts, so each is ticked against the same requirement IDs.
