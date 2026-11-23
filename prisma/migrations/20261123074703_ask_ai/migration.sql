-- CreateEnum
CREATE TYPE "KnowledgeAudience" AS ENUM ('EVERYONE', 'STAFF', 'ADMIN');

-- CreateTable
CREATE TABLE "AskGrant" (
    "token" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "sectionId" TEXT,
    "pensionerId" TEXT,
    "scopes" JSONB NOT NULL,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskGrant_pkey" PRIMARY KEY ("token"),
    -- A token short enough to guess must never open anything.
    CONSTRAINT "AskGrant_token_length" CHECK (length("token") >= 40)
);

-- CreateTable
CREATE TABLE "KnowledgeDoc" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'POLICY',
    "reference" TEXT,
    "body" TEXT NOT NULL,
    "audience" "KnowledgeAudience" NOT NULL DEFAULT 'EVERYONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AskGrant_expiresAt_idx" ON "AskGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "KnowledgeDoc_tenantId_isActive_idx" ON "KnowledgeDoc"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "AskGrant" ADD CONSTRAINT "AskGrant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskGrant" ADD CONSTRAINT "AskGrant_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every table with tenantId: row-level security and same-organisation keys (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
