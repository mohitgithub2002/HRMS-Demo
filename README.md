# Kosh — HR & Payroll Cloud

The multi-tenant edition of the DCB HRMS & Payroll system: one installation serves many organisations (Cantonment
Boards, municipal bodies, government bodies, companies), each with its own employees, pay rules, approvals and files —
kept apart by PostgreSQL row-level security, a tenant-scoped database client and per-organisation encryption keys.

- **Build plan:** [PLAN.md](./PLAN.md) · **Progress and decisions:** [PROGRESS.md](./PROGRESS.md)
- **Setting up an organisation, start to first payroll:** [docs/SETUP-GUIDE.md](./docs/SETUP-GUIDE.md)
- **How organisations are kept apart:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## Stack

Next.js 16 (App Router) + TypeScript · PostgreSQL 16 + Prisma 7 · Tailwind CSS v4 with an own component kit
(midnight, iris and champagne gold; Inter, Fraunces, Noto Sans Devanagari; light and dark) · Vitest + Playwright.

## Getting started

```bash
# PostgreSQL 16 with an ordinary (non-superuser) login — row-level security depends on it
createuser kosh --pwprompt --createdb && createdb -O kosh kosh_dev

cp .env.example .env          # fill the three keys:  openssl rand -base64 32
npm install
npm run db:deploy             # tables + row-level security
npm run db:seed               # platform owner + two demo organisations
npm run dev                   # http://localhost:3000
```

### Demo sign-ins (development and training copies)

The **Help Centre** at `/help` answers every setup question step by step (no sign-in needed).

Password for every demo login: **`Kosh@2026`**. With `SMS_PROVIDER=console` the one-time code is shown on screen.
The DEMO organisation has two closed months of payroll and pension, this month ready to work out, a vacancy with
applicants, a leaver to settle, and Ask AI switched on — with `ASK_AI_PROVIDER="scripted"` a practice stand-in answers
without an AI key.

| Where | Organisation code | Login | Who |
|---|---|---|---|
| Platform console `/platform/login` | — | `owner@kosh.local` | Platform owner |
| `/o/DEMO` | `DEMO` | `ADMIN` | Anita Sharma — Admin, Demo Cantonment Board |
| `/o/DEMO` | `DEMO` | `HR01` · `ACC01` · `CHK01` · `IT01` | HR manager · Accounts manager · Checker · IT support |
| `/o/DEMO` | `DEMO` | `DEMO00011` (or any `DEMO000nn`) | An employee — payslips, leave, attendance, record |
| `/o/DEMO` | `DEMO` | `DEMO09001` · `DEMO/PPO/2012/0031` | A retired pensioner · a family pensioner (Hindi) |
| `/o/SMC` | `SMC` | `ADMIN` · `HR01` | Shivalik Municipal Council (on trial, fewer modules) |

The same login IDs exist in both organisations on purpose — they are different people.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Develop / build / serve |
| `npm run typecheck` · `npm run lint` · `npm test` | Checks (integration tests need `TEST_DATABASE_URL`) |
| `npm run db:new -- <name>` | Write a migration from the schema (adds the row-level-security call) |
| `npm run db:deploy` · `npm run db:seed` | Apply migrations · seed |
