-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('PERMANENT_OPS', 'PERMANENT_NPS', 'CONTRACT', 'DAILY_WAGE', 'REEMPLOYED', 'DEPUTATION');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED', 'RESIGNED', 'TRANSFERRED', 'TERMINATED', 'DECEASED');

-- CreateEnum
CREATE TYPE "NomineeScheme" AS ENUM ('GPF', 'GRATUITY', 'GROUP_INSURANCE', 'FAMILY_PENSION', 'NPS');

-- CreateEnum
CREATE TYPE "ServiceEvent" AS ENUM ('APPOINTMENT', 'CONFIRMATION', 'INCREMENT', 'PROMOTION', 'MACP', 'PAY_FIXATION', 'TRANSFER', 'LEAVE', 'PENALTY', 'REWARD', 'RETIREMENT', 'SUSPENSION', 'REINSTATEMENT', 'EXIT', 'OTHER');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayChangeReason" AS ENUM ('INITIAL', 'INCREMENT', 'PROMOTION', 'MACP', 'CORRECTION');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeCode" TEXT,
    "type" "EmployeeType" NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT,
    "nameHi" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "dateOfJoining" DATE NOT NULL,
    "dateOfRetirement" DATE,
    "exitDate" DATE,
    "exitReason" TEXT,
    "sectionId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "payLevel" TEXT,
    "payCell" INTEGER,
    "incrementMonth" INTEGER,
    "mobile" TEXT,
    "email" TEXT,
    "fatherOrSpouseName" TEXT,
    "category" TEXT,
    "maritalStatus" TEXT,
    "bloodGroup" TEXT,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "presentAddress" JSONB,
    "permanentAddress" JSONB,
    "panEnc" TEXT,
    "panHash" TEXT,
    "panLast4" TEXT,
    "aadhaarEnc" TEXT,
    "aadhaarHash" TEXT,
    "aadhaarLast4" TEXT,
    "pran" TEXT,
    "uan" TEXT,
    "esicNumber" TEXT,
    "gpfNumber" TEXT,
    "bankAccountEnc" TEXT,
    "bankAccountHash" TEXT,
    "bankAccountLast4" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "probationEndDate" DATE,
    "confirmationDate" DATE,
    "biometricId" TEXT,
    "agencyName" TEXT,
    "wageRate" DECIMAL(12,2),
    "wageBasis" TEXT,
    "contractStart" DATE,
    "contractEnd" DATE,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "relation" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" DATE,
    "isDependent" BOOLEAN NOT NULL DEFAULT false,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nominee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "scheme" "NomineeScheme" NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "sharePercent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nominee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBookEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "event" "ServiceEvent" NOT NULL,
    "eventDate" DATE NOT NULL,
    "orderNumber" TEXT,
    "orderDate" DATE,
    "details" TEXT NOT NULL,
    "detailsHi" TEXT,
    "data" JSONB,
    "documentId" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceBookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeFieldHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "changedById" TEXT,
    "changedBy" TEXT,
    "approvedById" TEXT,
    "approvedBy" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeFieldHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanctionedPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "sectionId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sanctioned" INTEGER NOT NULL,
    "orderRef" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SanctionedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayMatrix" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "name" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "levels" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "payLevel" TEXT NOT NULL,
    "payCell" INTEGER NOT NULL,
    "postId" TEXT,
    "reason" "PayChangeReason" NOT NULL,
    "details" JSONB,
    "serviceEntryId" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_tenantId_sectionId_idx" ON "Employee"("tenantId", "sectionId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_status_idx" ON "Employee"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Employee_tenantId_panHash_idx" ON "Employee"("tenantId", "panHash");

-- CreateIndex
CREATE INDEX "Employee_tenantId_aadhaarHash_idx" ON "Employee"("tenantId", "aadhaarHash");

-- CreateIndex
CREATE INDEX "Employee_tenantId_bankAccountHash_idx" ON "Employee"("tenantId", "bankAccountHash");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_employeeCode_key" ON "Employee"("tenantId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_biometricId_key" ON "Employee"("tenantId", "biometricId");

-- CreateIndex
CREATE INDEX "FamilyMember_tenantId_employeeId_idx" ON "FamilyMember"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "Nominee_tenantId_employeeId_scheme_idx" ON "Nominee"("tenantId", "employeeId", "scheme");

-- CreateIndex
CREATE INDEX "EmployeeDocument_tenantId_employeeId_idx" ON "EmployeeDocument"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "ServiceBookEntry_tenantId_employeeId_eventDate_idx" ON "ServiceBookEntry"("tenantId", "employeeId", "eventDate");

-- CreateIndex
CREATE INDEX "EmployeeFieldHistory_tenantId_employeeId_createdAt_idx" ON "EmployeeFieldHistory"("tenantId", "employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SanctionedPost_tenantId_sectionId_postId_key" ON "SanctionedPost"("tenantId", "sectionId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "PayMatrix_tenantId_effectiveFrom_key" ON "PayMatrix"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PayHistory_tenantId_employeeId_effectiveFrom_idx" ON "PayHistory"("tenantId", "employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PayHistory_tenantId_reason_effectiveFrom_idx" ON "PayHistory"("tenantId", "reason", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBookEntry" ADD CONSTRAINT "ServiceBookEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFieldHistory" ADD CONSTRAINT "EmployeeFieldHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayHistory" ADD CONSTRAINT "PayHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table with tenantId: row-level security (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
