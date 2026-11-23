-- CreateEnum
CREATE TYPE "FileDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PREVIEW', 'APPROVED', 'REJECTED', 'DOWNLOADED', 'VALIDATED', 'INVALID', 'APPLIED');

-- CreateEnum
CREATE TYPE "SeparationKind" AS ENUM ('SUSPENSION', 'RESIGNATION', 'REMOVAL', 'DISMISSAL', 'TERMINATION', 'CONTRACT_END', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "SeparationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ENDED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('NONE', 'CHECKING', 'APPROVED', 'SETTLED');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ADVERTISED', 'CLOSED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('OPEN', 'PENDING_APPROVAL', 'APPROVED');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('APPLIED', 'ELIGIBLE', 'SHORTLISTED', 'SELECTED', 'WAITLISTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JoiningStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayHeadKind" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "PayHeadCalc" AS ENUM ('SYSTEM', 'FIXED', 'PERCENT_BASIC', 'ITEM');

-- CreateEnum
CREATE TYPE "PayGroup" AS ENUM ('OPS', 'NPS', 'CONTRACT', 'PENSION');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CHECKING', 'APPROVING', 'APPROVED', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "RunKind" AS ENUM ('REGULAR', 'SUPPLEMENTARY');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('INCLUDED', 'WITHHELD');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('CREDITED', 'FAILED', 'REPAID');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('BLOCK', 'WARN');

-- CreateEnum
CREATE TYPE "ExceptionResolution" AS ENUM ('EXPLAINED', 'WITHHELD', 'WAIVED');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('HBA', 'VEHICLE', 'COMPUTER', 'FESTIVAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'RUNNING', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GpfEntryKind" AS ENUM ('OPENING', 'SUBSCRIPTION', 'REFUND', 'ADVANCE', 'WITHDRAWAL', 'INTEREST');

-- CreateEnum
CREATE TYPE "GpfAdvanceKind" AS ENUM ('ADVANCE', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "GpfAdvanceStatus" AS ENUM ('PENDING', 'RUNNING', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PensionType" AS ENUM ('SUPERANNUATION', 'VOLUNTARY', 'INVALID', 'COMPULSORY', 'FAMILY');

-- CreateEnum
CREATE TYPE "PensionerStatus" AS ENUM ('ACTIVE', 'STOPPED');

-- CreateEnum
CREATE TYPE "LifeCertificateSource" AS ENUM ('MANUAL', 'JEEVAN_PRAMAAN');

-- CreateEnum
CREATE TYPE "LifeCertificateStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PensionCaseStatus" AS ENUM ('DRAFT', 'CHECKING', 'APPROVING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pensionerId" TEXT;

-- CreateTable
CREATE TABLE "FileRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "direction" "FileDirection" NOT NULL,
    "kind" TEXT NOT NULL,
    "period" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL,
    "meta" JSONB,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Separation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "kind" "SeparationKind" NOT NULL,
    "status" "SeparationStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveDate" DATE NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "documentId" TEXT,
    "endDate" DATE,
    "endNote" TEXT,
    "inputs" JSONB,
    "statement" JSONB,
    "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'NONE',
    "settlementRunId" TEXT,
    "receipts" JSONB,
    "settledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Separation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "referenceNo" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "payLevel" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "reservation" JSONB NOT NULL,
    "advertNumber" TEXT,
    "advertDate" DATE,
    "lastDate" DATE,
    "status" "VacancyStatus" NOT NULL DEFAULT 'DRAFT',
    "selectionStatus" "SelectionStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "vacancyId" TEXT NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "fatherName" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "qualification" TEXT,
    "score" DECIMAL(7,2),
    "meritRank" INTEGER,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'APPLIED',
    "remarks" TEXT,
    "appointmentLetterNo" TEXT,
    "appointmentLetterDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Joining" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "applicantId" TEXT,
    "vacancyId" TEXT,
    "employeeId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "status" "JoiningStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Joining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "key" TEXT NOT NULL,
    "value" DECIMAL(14,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayHead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "kind" "PayHeadKind" NOT NULL,
    "calc" "PayHeadCalc" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "postCodes" TEXT[],
    "prorate" BOOLEAN NOT NULL DEFAULT true,
    "countsForDa" BOOLEAN NOT NULL DEFAULT false,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "accountHead" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "headCode" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "fromMonth" TEXT NOT NULL,
    "toMonth" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "payGroup" "PayGroup" NOT NULL,
    "month" TEXT NOT NULL,
    "kind" "RunKind" NOT NULL DEFAULT 'REGULAR',
    "seq" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "source" JSONB,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "runById" TEXT NOT NULL,
    "runByName" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "employees" INTEGER NOT NULL DEFAULT 0,
    "gross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employer" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "checkedById" TEXT,
    "checkedByName" TEXT,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "bankFileId" TEXT,
    "paidAt" TIMESTAMP(3),
    "returnAt" TIMESTAMP(3),
    "summaryFileId" TEXT,
    "payslipsSentAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "reopenNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "payGroup" "PayGroup" NOT NULL,
    "sectionId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "payLevel" TEXT,
    "payCell" INTEGER,
    "status" "PayslipStatus" NOT NULL DEFAULT 'INCLUDED',
    "withheldReason" TEXT,
    "daysInMonth" INTEGER NOT NULL,
    "daysOnRoll" DECIMAL(5,1) NOT NULL,
    "lossDays" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "halfPayDays" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "workedDays" DECIMAL(5,1),
    "lines" JSONB NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL,
    "deductions" DECIMAL(12,2) NOT NULL,
    "net" DECIMAL(12,2) NOT NULL,
    "employer" DECIMAL(12,2) NOT NULL,
    "bankLast4" TEXT,
    "ifsc" TEXT,
    "lastNet" DECIMAL(12,2),
    "changePct" DECIMAL(8,2),
    "creditStatus" "CreditStatus",
    "creditNote" TEXT,
    "repayFileId" TEXT,
    "detail" JSONB,
    "sentAt" TIMESTAMP(3),
    "pensionerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "runId" TEXT NOT NULL,
    "employeeId" TEXT,
    "code" TEXT NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL,
    "vars" JSONB,
    "resolution" "ExceptionResolution",
    "note" TEXT,
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "type" "LoanType" NOT NULL,
    "purpose" TEXT,
    "principal" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "instalments" INTEGER NOT NULL,
    "instalmentAmount" DECIMAL(12,2) NOT NULL,
    "sanctionDate" DATE NOT NULL,
    "orderNumber" TEXT,
    "startMonth" TEXT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "closedMonth" TEXT,
    "openingInterest" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRecovery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "loanId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "principal" DECIMAL(12,2) NOT NULL,
    "interest" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpfEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "kind" "GpfEntryKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "runId" TEXT,
    "advanceId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpfEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpfAdvance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "kind" "GpfAdvanceKind" NOT NULL,
    "purpose" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "instalments" INTEGER NOT NULL DEFAULT 0,
    "instalmentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sanctionDate" DATE NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "startMonth" TEXT,
    "status" "GpfAdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "closedMonth" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpfAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "fy" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "slabs" JSONB NOT NULL,
    "standardDeduction" DECIMAL(12,2) NOT NULL,
    "rebateIncomeLimit" DECIMAL(14,2) NOT NULL,
    "rebateMax" DECIMAL(12,2) NOT NULL,
    "cessPercent" DECIMAL(5,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDeclaration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "regime" TEXT NOT NULL DEFAULT 'NEW',
    "items" JSONB NOT NULL,
    "proofs" JSONB,
    "status" "DeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCarryIn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "salary" DECIMAL(14,2) NOT NULL,
    "tds" DECIMAL(14,2) NOT NULL,
    "note" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxCarryIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TdsChallan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "fy" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "bsrCode" TEXT NOT NULL,
    "challanNo" TEXT NOT NULL,
    "depositedOn" DATE NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "cess" DECIMAL(14,2) NOT NULL,
    "interest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TdsChallan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form16" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "partBKey" TEXT,
    "partBSha" TEXT,
    "partAKey" TEXT,
    "partASha" TEXT,
    "working" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form16_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 0,
    "dates" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DueRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "code" TEXT NOT NULL,
    "dueOn" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DueReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pensioner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "ppoNumber" TEXT NOT NULL,
    "type" "PensionType" NOT NULL,
    "status" "PensionerStatus" NOT NULL DEFAULT 'ACTIVE',
    "relation" TEXT NOT NULL DEFAULT 'SELF',
    "payeeName" TEXT NOT NULL,
    "payeeNameHi" TEXT,
    "payeeDob" DATE NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "basicPension" DECIMAL(12,2) NOT NULL,
    "reducedPension" DECIMAL(12,2),
    "reducedFrom" DATE,
    "commutedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commutationDate" DATE,
    "commutationLumpSum" DECIMAL(14,2),
    "fmaEligible" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "endReason" TEXT,
    "endDetail" JSONB,
    "bankAccountEnc" TEXT,
    "bankAccountHash" TEXT,
    "bankAccountLast4" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "previousId" TEXT,
    "caseId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pensioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeCertificate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "pensionerId" TEXT NOT NULL,
    "source" "LifeCertificateSource" NOT NULL,
    "status" "LifeCertificateStatus" NOT NULL DEFAULT 'VERIFIED',
    "certifiedOn" DATE NOT NULL,
    "jpId" TEXT,
    "fileKey" TEXT,
    "fileSha" TEXT,
    "fileName" TEXT,
    "note" TEXT,
    "enteredById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifeCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PensionCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "type" "PensionType" NOT NULL,
    "retirementDate" DATE NOT NULL,
    "inputs" JSONB NOT NULL,
    "working" JSONB NOT NULL,
    "status" "PensionCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "ppoNumber" TEXT,
    "ppoKey" TEXT,
    "ppoSha" TEXT,
    "pensionerId" TEXT,
    "benefitsRunId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PensionCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoDuesItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "caseId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "byId" TEXT,
    "byName" TEXT,
    "at" TIMESTAMP(3),

    CONSTRAINT "NoDuesItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "code" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileRecord_tenantId_kind_period_idx" ON "FileRecord"("tenantId", "kind", "period");

-- CreateIndex
CREATE INDEX "Separation_tenantId_status_idx" ON "Separation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Separation_employeeId_idx" ON "Separation"("employeeId");

-- CreateIndex
CREATE INDEX "Vacancy_tenantId_status_idx" ON "Vacancy"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_tenantId_referenceNo_key" ON "Vacancy"("tenantId", "referenceNo");

-- CreateIndex
CREATE INDEX "Applicant_vacancyId_status_idx" ON "Applicant"("vacancyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_vacancyId_applicationNo_key" ON "Applicant"("vacancyId", "applicationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Joining_applicantId_key" ON "Joining"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Joining_employeeId_key" ON "Joining"("employeeId");

-- CreateIndex
CREATE INDEX "Joining_tenantId_status_idx" ON "Joining"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PayRate_tenantId_key_idx" ON "PayRate"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PayRate_tenantId_key_effectiveFrom_key" ON "PayRate"("tenantId", "key", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PayHead_tenantId_code_key" ON "PayHead"("tenantId", "code");

-- CreateIndex
CREATE INDEX "EmployeePayItem_employeeId_idx" ON "EmployeePayItem"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePayItem_tenantId_headCode_idx" ON "EmployeePayItem"("tenantId", "headCode");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_tenantId_payGroup_month_kind_seq_key" ON "PayrollRun"("tenantId", "payGroup", "month", "kind", "seq");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_month_idx" ON "Payslip"("employeeId", "month");

-- CreateIndex
CREATE INDEX "Payslip_pensionerId_idx" ON "Payslip"("pensionerId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_runId_employeeId_key" ON "Payslip"("runId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollException_runId_idx" ON "PayrollException"("runId");

-- CreateIndex
CREATE INDEX "Loan_employeeId_idx" ON "Loan"("employeeId");

-- CreateIndex
CREATE INDEX "Loan_tenantId_status_idx" ON "Loan"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LoanRecovery_runId_idx" ON "LoanRecovery"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanRecovery_loanId_runId_key" ON "LoanRecovery"("loanId", "runId");

-- CreateIndex
CREATE INDEX "GpfEntry_employeeId_month_idx" ON "GpfEntry"("employeeId", "month");

-- CreateIndex
CREATE INDEX "GpfEntry_runId_idx" ON "GpfEntry"("runId");

-- CreateIndex
CREATE INDEX "GpfAdvance_employeeId_status_idx" ON "GpfAdvance"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRule_tenantId_fy_regime_key" ON "TaxRule"("tenantId", "fy", "regime");

-- CreateIndex
CREATE UNIQUE INDEX "TaxDeclaration_employeeId_fy_key" ON "TaxDeclaration"("employeeId", "fy");

-- CreateIndex
CREATE UNIQUE INDEX "TaxCarryIn_employeeId_fy_key" ON "TaxCarryIn"("employeeId", "fy");

-- CreateIndex
CREATE UNIQUE INDEX "TdsChallan_tenantId_month_challanNo_key" ON "TdsChallan"("tenantId", "month", "challanNo");

-- CreateIndex
CREATE UNIQUE INDEX "Form16_employeeId_fy_key" ON "Form16"("employeeId", "fy");

-- CreateIndex
CREATE UNIQUE INDEX "DueRule_tenantId_code_key" ON "DueRule"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "DueReminder_tenantId_code_dueOn_key" ON "DueReminder"("tenantId", "code", "dueOn");

-- CreateIndex
CREATE INDEX "Pensioner_employeeId_idx" ON "Pensioner"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Pensioner_tenantId_ppoNumber_key" ON "Pensioner"("tenantId", "ppoNumber");

-- CreateIndex
CREATE INDEX "LifeCertificate_pensionerId_certifiedOn_idx" ON "LifeCertificate"("pensionerId", "certifiedOn");

-- CreateIndex
CREATE INDEX "PensionCase_employeeId_idx" ON "PensionCase"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "NoDuesItem_caseId_sectionId_key" ON "NoDuesItem"("caseId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleTable_tenantId_code_effectiveFrom_key" ON "RuleTable"("tenantId", "code", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pensionerId_fkey" FOREIGN KEY ("pensionerId") REFERENCES "Pensioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Separation" ADD CONSTRAINT "Separation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joining" ADD CONSTRAINT "Joining_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joining" ADD CONSTRAINT "Joining_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joining" ADD CONSTRAINT "Joining_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayItem" ADD CONSTRAINT "EmployeePayItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollException" ADD CONSTRAINT "PayrollException_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollException" ADD CONSTRAINT "PayrollException_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRecovery" ADD CONSTRAINT "LoanRecovery_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpfEntry" ADD CONSTRAINT "GpfEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpfEntry" ADD CONSTRAINT "GpfEntry_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "GpfAdvance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpfAdvance" ADD CONSTRAINT "GpfAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeclaration" ADD CONSTRAINT "TaxDeclaration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCarryIn" ADD CONSTRAINT "TaxCarryIn_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form16" ADD CONSTRAINT "Form16_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pensioner" ADD CONSTRAINT "Pensioner_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeCertificate" ADD CONSTRAINT "LifeCertificate_pensionerId_fkey" FOREIGN KEY ("pensionerId") REFERENCES "Pensioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PensionCase" ADD CONSTRAINT "PensionCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoDuesItem" ADD CONSTRAINT "NoDuesItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PensionCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoDuesItem" ADD CONSTRAINT "NoDuesItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every table with tenantId: row-level security and same-organisation keys (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
