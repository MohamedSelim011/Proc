-- AlterTable
ALTER TABLE "public"."PurchaseOrder"
ADD COLUMN "sourceMaterialRequisitionId" TEXT,
ADD COLUMN "sourceDepartmentId" TEXT,
ADD COLUMN "sourceDepartmentName" TEXT,
ADD COLUMN "sourceProjectId" TEXT,
ADD COLUMN "sourceProjectName" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseOrder_sourceMaterialRequisitionId_idx" ON "public"."PurchaseOrder"("sourceMaterialRequisitionId");

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_sourceMaterialRequisitionId_fkey"
FOREIGN KEY ("sourceMaterialRequisitionId")
REFERENCES "public"."InventoryMaterialRequisition"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

