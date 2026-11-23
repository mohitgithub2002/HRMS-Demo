-- AlterEnum
BEGIN;
CREATE TYPE "ApprovalStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED');
ALTER TABLE "public"."ApprovalTask" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ApprovalTask" ALTER COLUMN "status" TYPE "ApprovalStatus_new" USING ("status"::text::"ApprovalStatus_new");
ALTER TYPE "ApprovalStatus" RENAME TO "ApprovalStatus_old";
ALTER TYPE "ApprovalStatus_new" RENAME TO "ApprovalStatus";
DROP TYPE "public"."ApprovalStatus_old";
ALTER TABLE "ApprovalTask" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropIndex
DROP INDEX "ApprovalTask_tenantId_status_waitingFor_idx";

-- AlterTable
ALTER TABLE "ApprovalTask" DROP COLUMN "decidedById",
DROP COLUMN "history",
DROP COLUMN "remarks",
DROP COLUMN "step",
DROP COLUMN "waitingFor",
ADD COLUMN     "deciderId" TEXT,
ADD COLUMN     "deciderName" TEXT,
ADD COLUMN     "decisionNote" TEXT,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "makerNote" TEXT,
ADD COLUMN     "requiredPermission" "Permission" NOT NULL,
ADD COLUMN     "titleHi" TEXT;

-- CreateIndex
CREATE INDEX "ApprovalTask_tenantId_status_requiredPermission_idx" ON "ApprovalTask"("tenantId", "status", "requiredPermission");


-- Every table with tenantId: row-level security (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
