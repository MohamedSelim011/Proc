-- CreateTable
CREATE TABLE "PurchaseOrderDocument" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderDocument_poId_idx" ON "PurchaseOrderDocument"("poId");

-- CreateIndex
CREATE INDEX "PurchaseOrderDocument_uploadedAt_idx" ON "PurchaseOrderDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "PurchaseOrderDocument" ADD CONSTRAINT "PurchaseOrderDocument_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
