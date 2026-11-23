-- AlterTable
ALTER TABLE "OtpChallenge" ADD COLUMN     "context" JSONB;

-- Every table with tenantId: row-level security and same-organisation keys (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
