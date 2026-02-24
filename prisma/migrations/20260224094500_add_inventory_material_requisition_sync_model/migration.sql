-- CreateTable
CREATE TABLE "public"."InventoryMaterialRequisition" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "requisitionNumber" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "projectExternalId" TEXT,
    "projectCode" TEXT,
    "projectName" TEXT,
    "departmentExternalId" TEXT,
    "departmentName" TEXT,
    "requesterExternalId" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "requiredDate" TIMESTAMP(3),
    "purpose" TEXT,
    "justification" TEXT,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryMaterialRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMaterialRequisition_externalId_key" ON "public"."InventoryMaterialRequisition"("externalId");

-- CreateIndex
CREATE INDEX "InventoryMaterialRequisition_status_idx" ON "public"."InventoryMaterialRequisition"("status");

-- CreateIndex
CREATE INDEX "InventoryMaterialRequisition_projectName_idx" ON "public"."InventoryMaterialRequisition"("projectName");

-- CreateIndex
CREATE INDEX "InventoryMaterialRequisition_externalUpdatedAt_idx" ON "public"."InventoryMaterialRequisition"("externalUpdatedAt");
