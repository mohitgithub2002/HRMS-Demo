@AGENTS.md

# Kosh HRMS Cloud — working notes

- **Source of truth:** `PLAN.md` (build order, module checklists with the original PRD IDs) and `PROGRESS.md` (what is
  done and decided). Read both before starting; update both when a module lands. The single-tenant original is
  `mohitgithub2002/HRMS-Payroll-System` — its pure rules are carried over and re-verified, never copied blindly.
- **Stack:** Next.js 16 (App Router, `src/proxy.ts`), TypeScript strict, Tailwind v4, Prisma 7 + PostgreSQL 16.
- **Tenancy (docs/ARCHITECTURE.md):** every business table has `tenantId String @default(dbgenerated("current_setting('app.tenant_id'::text, true)"))`
  and every migration ends with `SELECT kosh_enable_rls();` — write migrations with `npm run db:new -- <name>` (never
  `migrate reset`). The pool (`core/tenancy/pool.ts`) sends BEGIN with the setting (pipelining and unawaited
  read-only COMMITs only with `DB_PIPELINE=1` — off: they drained the pool on Vercel + Neon) — never set the tenant
  per session instead. Business code uses
  `actor.db` (a `tenantDb()` client) and never imports `@/core/tenancy/raw` or
  `@/core/tenancy/platform` (ESLint enforces it). Cross-tenant code lives only in `src/platform`. Add every new tenant
  table to the isolation reasoning: the RLS test checks all of them automatically.
- **Layers:** `src/modules/<module>/service.ts` = rules + permission checks, taking an `Actor`; `src/app/api/v1/**` thin
  wrappers (`apiRoute(handler, { module })`); pages read through the same services and guard with `requireAccess`.
  Every write: `audit()` + (approved changes) `emit()` in the same transaction; maker-checker via `src/core/approvals`.
- **Permissions:** `src/core/auth/access.ts` is §14 as data, narrowed by the tenant's modules (`FN_MODULE`). Menus in
  `src/core/auth/menu.ts`. Simple vs two-step way of working: setting `workflow`, on the actor as `actor.simple`.
- **Starter packs:** a module that keeps masters adds a `PackInstaller` in `src/platform/packs` so new organisations get
  them at creation.
- **Setup checklist:** a module that needs setting up adds its step to `src/modules/setup/status.ts` (worked out from
  data, never ticked by hand) and its chapter to `docs/SETUP-GUIDE.md`.
- **Speed:** Prisma `relationJoins` is on (an `include` is one query); read in parallel; settings through
  `getSetting` / `requestSettings` (one query per page). Cache only slow repeated figures, per person, with
  `cachedForPerson` (`core/cache.ts`) — `apiRoute` clears an organisation's cache after every change.
- **Text:** every visible string in `src/i18n/en/*.ts` and `src/i18n/hi/*.ts` (same keys and placeholders — tested).
  Simple words.
- **Design:** tokens in `src/app/globals.css` (canvas / surface / line / ink / muted + brand and gold scales, light and
  dark). Components in `src/components/ui`. One solid primary button per screen; `font-display` for titles and
  figures; wide tables use `<Table stack>` with `<Td label>`; nothing may scroll sideways on a phone.
- **Money:** `src/core/money.ts` (paise maths, rupee rounding). **Dates:** `src/core/dates.ts` (ISO strings, India time).
- **Porting from the original:** `scripts/port/` (schema, code, a second pass for `boardId` helpers, tests, wording) —
  mechanical first, then fixed by hand until checks are green and the screens are checked in a browser.
- **Pay core (Modules 7–10):** pure rules as in the original (`payroll/engine.ts`, `statutory/tax-rules.ts`,
  `pension/rules.ts` …); `payroll/compute.ts`, `statutory/stat-build.ts`, `pension/compute.ts` take a client and are
  seed-safe. Generated files go through `core/files/outgoing.ts` (FileRecord + StoredFile, released by maker-checker;
  `onFileReleased` hooks); pay bills are signed with `core/auth/sign.ts`. Messages: `core/connectors/sms.ts` and
  `email.ts` (per-organisation settings). The organisation's name / code for documents: `orgOf(db)` in
  `core/tenancy/tenant.ts` — never a hard-coded name. Tests install pack parts with `installPack(boardId, keys)`.
- **Help Centre (`/help`):** a module that adds or changes a screen adds or updates its questions in
  `src/modules/help/guide.ts` and `help.q.*` in both dictionaries (`tests/unit/help.test.ts` checks words, steps and links).
- **Checks before commit:** `npm run typecheck && npm run lint && npm test && npm run build`.
