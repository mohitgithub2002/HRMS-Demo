-- §1 "Clean payroll" (EM-03): no two current employees of an organisation share an Aadhaar, PAN or bank account.
-- Partial unique indexes enforce it in the database itself, per organisation; people who have left are excluded, so
-- a re-employed pensioner or a family account re-used after a death does not collide with history. The kosh_tuniq_
-- prefix keeps them out of Prisma's diffs (scripts/new-migration.sh), like the other same-organisation keys.
CREATE UNIQUE INDEX "kosh_tuniq_employee_active_pan" ON "Employee" ("tenantId", "panHash")
  WHERE "panHash" IS NOT NULL AND "status" IN ('DRAFT', 'ACTIVE', 'SUSPENDED');
CREATE UNIQUE INDEX "kosh_tuniq_employee_active_aadhaar" ON "Employee" ("tenantId", "aadhaarHash")
  WHERE "aadhaarHash" IS NOT NULL AND "status" IN ('DRAFT', 'ACTIVE', 'SUSPENDED');
CREATE UNIQUE INDEX "kosh_tuniq_employee_active_bank" ON "Employee" ("tenantId", "bankAccountHash")
  WHERE "bankAccountHash" IS NOT NULL AND "status" IN ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- Every table with tenantId: row-level security and same-organisation keys (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
