-- Expand InventoryMaterialRequisition to store fields compatible with Inventory MaterialRequisition model
ALTER TABLE "public"."InventoryMaterialRequisition"
ADD COLUMN "mrNumber" TEXT,
ADD COLUMN "requestDate" TIMESTAMP(3),
ADD COLUMN "requestedById" TEXT,
ADD COLUMN "requestBasis" TEXT,
ADD COLUMN "requestedDepartmentId" TEXT,
ADD COLUMN "requestedDepartmentName" TEXT,
ADD COLUMN "requestedProjectId" TEXT,
ADD COLUMN "requestedProjectName" TEXT,
ADD COLUMN "projectId" TEXT,
ADD COLUMN "wbsCodeId" TEXT,
ADD COLUMN "deliveryWarehouseId" TEXT,
ADD COLUMN "estimatedCost" DECIMAL,
ADD COLUMN "committedCost" DECIMAL,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "fulfilledAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "procurementPrId" TEXT,
ADD COLUMN "sourceMaterialRequestId" TEXT;

CREATE INDEX "InventoryMaterialRequisition_mrNumber_idx"
ON "public"."InventoryMaterialRequisition"("mrNumber");

CREATE INDEX "InventoryMaterialRequisition_requestedProjectName_idx"
ON "public"."InventoryMaterialRequisition"("requestedProjectName");
