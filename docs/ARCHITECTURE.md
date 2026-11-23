# Kosh — architecture

## Tenancy model

**Pooled**: one database, one schema, every business row carries `tenantId`. One migration upgrades every
organisation; adding an organisation is a few rows. The client is resolved per tenant in one function
(`tenantDb(tenantId)` in `src/core/tenancy/scoped.ts`), so a very large organisation can later be routed to its own
database (**silo**) without touching any module — the schema is identical.

```
Browser ──cookie kosh_session──▶ getActor()
                                   │  Session row (platform table) → tenantId   ◀── wall 1: the session decides the tenant
                                   ▼
                              tenantDb(tenantId)
                                   │  adds tenantId to every where / data        ◀── wall 3: the application's own filter
                                   │  BEGIN; set_config('app.tenant_id', …)
                                   ▼
                              PostgreSQL  FORCE ROW LEVEL SECURITY               ◀── wall 2: the database's filter
                              policy tenant_isolation:
                                "tenantId" = current_setting('app.tenant_id')
```

## The walls

1. **Session → tenant.** A sign-in is always for one organisation (organisation code + login ID). The session row
   stores the tenant; nothing in a URL, form or header can change it. The platform console uses other tables
   (`PlatformUser`, `PlatformSession`) and another cookie (`kosh_platform`).
2. **Row-level security.** Every table with a `tenantId` column has RLS enabled and **forced** (so even the table
   owner obeys), with one policy comparing the row's tenant to the transaction setting `app.tenant_id`. New rows take
   their `tenantId` from the same setting by default, and `WITH CHECK` refuses a row for another tenant. The policy is
   installed by `kosh_enable_rls()`, which every migration calls at its end (`npm run db:new -- <name>` adds the call).
   The platform console's deliberate cross-tenant work (counts, provisioning) goes through `acrossTenants()`, which
   sets `app.platform = 'on'` in its own transaction — only `src/core` and `src/platform` may import it.
3. **Scoped client.** `tenantDb()` adds `tenantId` to every `where` and `data` (and strips any `tenantId` an update
   tries to set). It refuses the platform tables. A lint rule (`eslint.config.mjs`) keeps `src/modules`, the
   organisation app and its API away from the raw client. At start-up the app checks its database login cannot bypass
   RLS and refuses to run in production if it can.
4. **Keys per tenant.** Aadhaar, PAN and bank numbers are encrypted with AES-256-GCM using a key derived with
   HKDF-SHA256 from the master key and the tenant id; duplicate-finding hashes use a per-tenant HMAC key. A value
   copied into another organisation cannot be decrypted there, and equal PANs hash differently across organisations.
5. **Files, limits and logs.** Stored files are tenant rows; rate limits are kept per tenant as well as per session;
   each organisation has its own append-only audit trail, and the platform team has another.

6. **Same-organisation references.** PostgreSQL checks foreign keys without row-level security, so a plain key would
   let organisation A store a row pointing at organisation B's employee. `kosh_tenant_fks()` (run by
   `kosh_enable_rls()` in every migration) gives every foreign key between two tenant tables a partner key on
   `("tenantId", column) → ("tenantId", id)`, so a row can only point at a row of its own organisation. These keys
   are named `kosh_tfk_*` / `kosh_tuniq_*` and live outside `schema.prisma`; `npm run db:new` keeps Prisma from
   dropping them. A test fails if any foreign key lacks its partner.

`tests/integration/isolation.test.ts` proves walls 2 and 3 separately: reads, finds by id, updates, deletes, upserts,
counts, moves, transactions and raw SQL — and RLS alone with no filter in the query.

## Cost of the walls

Each top-level query of a tenant client runs as `BEGIN; set_config; query; COMMIT` (one pooled connection, four
short statements). On a database in the same region that is about a millisecond. Pages read in parallel
(`Promise.all`) and services batch their writes in one `$transaction`, which sets the tenant once.

## Layers

| Layer | Where | Rules |
|---|---|---|
| Core | `src/core` | tenancy, auth, sessions, OTP, access matrix, approvals, audit, outbox, i18n, money, dates, crypto |
| Platform | `src/platform` | organisations, provisioning, packs, platform users and audit — the only code that crosses tenants |
| Modules | `src/modules/<module>` | business rules and permission checks; pure rules in their own files (unit-tested); take an `Actor` (which carries `db`, the tenant client) |
| API | `src/app/api/v1/**` (organisation), `src/app/api/platform/**` (console) | thin wrappers: `apiRoute` / `publicRoute` / `platformRoute` |
| Screens | `src/app/(auth)`, `src/app/(app)`, `src/app/platform` | read through the same services |

Every write records an audit row and, for approved changes, an outbox event in the same transaction.

## Provisioning

`provisionTenant()` (`src/platform/provision.ts`) creates the tenant row, then in **one tenant transaction** runs
the starter pack's installers (only for the modules switched on) and creates the first Admin; if anything fails the
tenant row is removed. Packs live in `src/platform/packs`; each module adds its installer (pay matrix, rates, pay
heads, leave types, tax slabs…) as it is built.

## Modules per tenant

`Tenant.modules` lists what is switched on. `access.ts` narrows every right by it (`fnEnabled`), menus are built from
rights, `apiRoute(..., { module })` refuses calls to a module that is off, and pages use `requireAccess(fn, action,
module)`.
