ALTER TABLE "public"."PurchaseRequisition"
ADD COLUMN IF NOT EXISTS "integrationSource" TEXT,
ADD COLUMN IF NOT EXISTS "externalId" TEXT,
ADD COLUMN IF NOT EXISTS "externalStatus" TEXT,
ADD COLUMN IF NOT EXISTS "externalPriority" TEXT,
ADD COLUMN IF NOT EXISTS "mrNumber" TEXT,
ADD COLUMN IF NOT EXISTS "requestedById" TEXT,
ADD COLUMN IF NOT EXISTS "requestBasis" TEXT,
ADD COLUMN IF NOT EXISTS "requestedDepartmentId" TEXT,
ADD COLUMN IF NOT EXISTS "requestedDepartmentName" TEXT,
ADD COLUMN IF NOT EXISTS "requestedProjectId" TEXT,
ADD COLUMN IF NOT EXISTS "requestedProjectName" TEXT,
ADD COLUMN IF NOT EXISTS "wbsCodeId" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryWarehouseId" TEXT,
ADD COLUMN IF NOT EXISTS "committedCost" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
ADD COLUMN IF NOT EXISTS "procurementPrId" TEXT,
ADD COLUMN IF NOT EXISTS "projectExternalId" TEXT,
ADD COLUMN IF NOT EXISTS "projectCode" TEXT,
ADD COLUMN IF NOT EXISTS "projectName" TEXT,
ADD COLUMN IF NOT EXISTS "departmentExternalId" TEXT,
ADD COLUMN IF NOT EXISTS "departmentName" TEXT,
ADD COLUMN IF NOT EXISTS "requesterExternalId" TEXT,
ADD COLUMN IF NOT EXISTS "requesterName" TEXT,
ADD COLUMN IF NOT EXISTS "requesterEmail" TEXT,
ADD COLUMN IF NOT EXISTS "requiredDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "purpose" TEXT,
ADD COLUMN IF NOT EXISTS "externalCreatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "externalUpdatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rawPayload" JSONB;

UPDATE "public"."PurchaseRequisition"
SET "integrationSource" = 'INTERNAL'
WHERE "integrationSource" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseRequisition_externalId_key"
ON "public"."PurchaseRequisition"("externalId");

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_externalUpdatedAt_idx"
ON "public"."PurchaseRequisition"("externalUpdatedAt");

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_mrNumber_idx"
ON "public"."PurchaseRequisition"("mrNumber");

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_projectName_idx"
ON "public"."PurchaseRequisition"("projectName");

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_requestedProjectName_idx"
ON "public"."PurchaseRequisition"("requestedProjectName");

ALTER TABLE "public"."PurchaseOrder"
DROP CONSTRAINT IF EXISTS "PurchaseOrder_sourceMaterialRequisitionId_fkey";

ALTER TABLE "public"."PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_sourceMaterialRequisitionId_fkey"
FOREIGN KEY ("sourceMaterialRequisitionId")
REFERENCES "public"."PurchaseRequisition"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
