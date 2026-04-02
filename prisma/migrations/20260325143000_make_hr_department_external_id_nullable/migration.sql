-- Make externalId optional for internal-mode department creation
ALTER TABLE "public"."HrDepartment"
ALTER COLUMN "externalId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."HrProject" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT,
    "departmentName" TEXT,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrProject_externalId_key" ON "public"."HrProject"("externalId");

-- CreateIndex
CREATE INDEX "HrProject_code_idx" ON "public"."HrProject"("code");

-- CreateIndex
CREATE INDEX "HrProject_name_idx" ON "public"."HrProject"("name");

-- CreateIndex
CREATE INDEX "HrProject_status_idx" ON "public"."HrProject"("status");

-- CreateIndex
CREATE INDEX "HrProject_isActive_idx" ON "public"."HrProject"("isActive");

-- CreateIndex
CREATE INDEX "HrProject_departmentId_idx" ON "public"."HrProject"("departmentId");

-- CreateIndex
CREATE INDEX "HrProject_externalUpdatedAt_idx" ON "public"."HrProject"("externalUpdatedAt");

-- AddForeignKey
ALTER TABLE "public"."HrProject"
ADD CONSTRAINT "HrProject_departmentId_fkey"
FOREIGN KEY ("departmentId")
REFERENCES "public"."HrDepartment"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
