-- CreateTable
CREATE TABLE "public"."HrDepartment" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "code" TEXT,
    "costCenterCode" TEXT,
    "parentExternalId" TEXT,
    "description" TEXT,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrDepartment_externalId_key" ON "public"."HrDepartment"("externalId");

-- CreateIndex
CREATE INDEX "HrDepartment_name_idx" ON "public"."HrDepartment"("name");

-- CreateIndex
CREATE INDEX "HrDepartment_code_idx" ON "public"."HrDepartment"("code");

-- CreateIndex
CREATE INDEX "HrDepartment_type_idx" ON "public"."HrDepartment"("type");

-- CreateIndex
CREATE INDEX "HrDepartment_isActive_idx" ON "public"."HrDepartment"("isActive");

-- CreateIndex
CREATE INDEX "HrDepartment_externalUpdatedAt_idx" ON "public"."HrDepartment"("externalUpdatedAt");
