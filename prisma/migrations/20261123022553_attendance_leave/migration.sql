-- CreateEnum
CREATE TYPE "HolidayKind" AS ENUM ('GAZETTED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'MISSED_PUNCH', 'ON_DUTY', 'LEAVE', 'HOLIDAY', 'WEEKLY_OFF', 'DIES_NON');

-- CreateEnum
CREATE TYPE "DaySource" AS ENUM ('DEVICE', 'MUSTER', 'REQUEST', 'LOCK', 'LEAVE');

-- CreateEnum
CREATE TYPE "AttendanceRequestType" AS ENUM ('MISSED_PUNCH', 'ON_DUTY');

-- CreateEnum
CREATE TYPE "LeavePay" AS ENUM ('FULL', 'HALF', 'NONE');

-- CreateEnum
CREATE TYPE "LeaveCreditMode" AS ENUM ('HALF_YEARLY', 'YEARLY', 'SPELL', 'SERVICE', 'NONE');

-- CreateEnum
CREATE TYPE "LeaveEntryKind" AS ENUM ('OPENING', 'CREDIT', 'DEBIT', 'LAPSE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED');

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropIndex

-- DropIndex

-- DropIndex

-- DropIndex

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "kind" "HolidayKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePunch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "deviceSerial" TEXT,
    "importId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceImport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "savedCount" INTEGER NOT NULL,
    "duplicateCount" INTEGER NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceDay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL,
    "firstIn" TIMESTAMP(3),
    "lastOut" TIMESTAMP(3),
    "workedMinutes" INTEGER,
    "source" "DaySource" NOT NULL,
    "leaveCode" TEXT,
    "half" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT true,
    "applicationId" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "AttendanceRequestType" NOT NULL,
    "inTime" TEXT,
    "outTime" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "taskId" TEXT,
    "createdById" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "sectionId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "lockedById" TEXT NOT NULL,
    "lockedByName" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" TIMESTAMP(3),
    "unlockNote" TEXT,

    CONSTRAINT "AttendanceLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceMonth" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "daysInMonth" INTEGER NOT NULL,
    "daysOnRoll" INTEGER NOT NULL,
    "present" DECIMAL(5,1) NOT NULL,
    "late" INTEGER NOT NULL,
    "halfDays" INTEGER NOT NULL,
    "onDuty" INTEGER NOT NULL,
    "leave" DECIMAL(5,1) NOT NULL,
    "holidays" INTEGER NOT NULL,
    "weeklyOffs" INTEGER NOT NULL,
    "diesNon" DECIMAL(5,1) NOT NULL,
    "halfPayLeave" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "noPayLeave" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "payableDays" DECIMAL(5,1) NOT NULL,
    "workedDays" DECIMAL(5,1) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "pay" "LeavePay" NOT NULL,
    "creditMode" "LeaveCreditMode" NOT NULL,
    "creditDays" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "cap" DECIMAL(6,1),
    "lapsesAtYearEnd" BOOLEAN NOT NULL DEFAULT false,
    "debitFrom" TEXT,
    "debitFactor" DECIMAL(3,1) NOT NULL DEFAULT 1,
    "countsOffDays" BOOLEAN NOT NULL DEFAULT true,
    "halfDayAllowed" BOOLEAN NOT NULL DEFAULT false,
    "needsCertificate" BOOLEAN NOT NULL DEFAULT false,
    "restrictedOnly" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT,
    "employeeTypes" "EmployeeType"[],
    "officerLimitDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "leaveCode" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "LeaveEntryKind" NOT NULL,
    "days" DECIMAL(6,1) NOT NULL,
    "period" TEXT,
    "applicationId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "employeeId" TEXT NOT NULL,
    "leaveCode" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "halfDay" BOOLEAN NOT NULL DEFAULT false,
    "days" DECIMAL(6,1) NOT NULL,
    "debitCode" TEXT NOT NULL,
    "debitDays" DECIMAL(6,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "contact" TEXT,
    "attachmentFileId" TEXT,
    "attachmentName" TEXT,
    "attachmentSha256" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "taskId" TEXT,
    "onBehalf" BOOLEAN NOT NULL DEFAULT false,
    "sanctionRef" TEXT,
    "createdById" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Holiday_tenantId_date_idx" ON "Holiday"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_tenantId_date_name_key" ON "Holiday"("tenantId", "date", "name");

-- CreateIndex
CREATE INDEX "AttendancePunch_tenantId_at_idx" ON "AttendancePunch"("tenantId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePunch_employeeId_at_key" ON "AttendancePunch"("employeeId", "at");

-- CreateIndex
CREATE INDEX "AttendanceImport_tenantId_createdAt_idx" ON "AttendanceImport"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceDay_tenantId_date_idx" ON "AttendanceDay"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDay_employeeId_date_key" ON "AttendanceDay"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRequest_tenantId_status_idx" ON "AttendanceRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AttendanceRequest_employeeId_date_idx" ON "AttendanceRequest"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLock_tenantId_sectionId_month_key" ON "AttendanceLock"("tenantId", "sectionId", "month");

-- CreateIndex
CREATE INDEX "AttendanceMonth_tenantId_month_idx" ON "AttendanceMonth"("tenantId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceMonth_employeeId_month_key" ON "AttendanceMonth"("employeeId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_tenantId_code_key" ON "LeaveType"("tenantId", "code");

-- CreateIndex
CREATE INDEX "LeaveLedger_employeeId_leaveCode_idx" ON "LeaveLedger"("employeeId", "leaveCode");

-- CreateIndex
CREATE INDEX "LeaveLedger_tenantId_date_idx" ON "LeaveLedger"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveLedger_employeeId_leaveCode_period_key" ON "LeaveLedger"("employeeId", "leaveCode", "period");

-- CreateIndex
CREATE INDEX "LeaveApplication_employeeId_fromDate_idx" ON "LeaveApplication"("employeeId", "fromDate");

-- CreateIndex
CREATE INDEX "LeaveApplication_tenantId_status_idx" ON "LeaveApplication"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRequest" ADD CONSTRAINT "AttendanceRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLock" ADD CONSTRAINT "AttendanceLock_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceMonth" ADD CONSTRAINT "AttendanceMonth_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceMonth" ADD CONSTRAINT "AttendanceMonth_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedger" ADD CONSTRAINT "LeaveLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table with tenantId: row-level security (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
