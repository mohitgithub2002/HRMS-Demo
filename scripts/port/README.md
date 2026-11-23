# Porting tools (development only)

Kosh carries over the proven parts of the single-tenant original (`mohitgithub2002/HRMS-Payroll-System`, checked
out next to this repository as `../HRMS-Payroll-System`). These scripts do the mechanical part; every ported file
is then fixed by hand until `npm run typecheck`, `lint` and the tests are green, and its screens are checked.

| Script | Does |
|---|---|
| `port_schema.py Model Enum …` | Copies models/enums into `prisma/schema.prisma`: `boardId` → RLS-defaulted `tenantId` (added where missing), keys rescoped, real relations for `employeeId` / `sectionId` / `postId` so `kosh_tenant_fks()` guards them. Then `npm run db:new -- <name>` |
| `port.py <path under src> …` | Copies code: import paths, `db` → `actor.db`, per-tenant crypto, theme classes → Kosh tokens, optional Hindi names |
| `boardify.py <file> …` | Second pass: `fn(boardId, …, tx = db)` helpers → `fn(db, …)`, `boardId` filters removed, compound keys rescoped |
| `port_test.py <name> …` | Ports an original integration test onto `tests/support/factory.ts` |
| `export-i18n.ts <outDir> <area> …` | Writes an area of the original dictionaries (English + Hindi) with "Board" wording made general. Run from the original's folder with `npx tsx` |
| `merge-i18n.ts <file> <area>` | Adds keys the original has and Kosh lacks to one area (same) |

The two `.ts` helpers import the original's dictionaries, so copy them into `../HRMS-Payroll-System` to run them.
