-- CreateTable
CREATE TABLE "public"."PurchaseRequisitionDocument" (
    "id" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRequisitionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequisitionDocument_prId_idx" ON "public"."PurchaseRequisitionDocument"("prId");

-- CreateIndex
CREATE INDEX "PurchaseRequisitionDocument_uploadedAt_idx" ON "public"."PurchaseRequisitionDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "public"."PurchaseRequisitionDocument" ADD CONSTRAINT "PurchaseRequisitionDocument_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
