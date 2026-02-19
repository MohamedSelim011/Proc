-- CreateTable
CREATE TABLE "ServiceRFPDocument" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRFPDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRFPDocument_rfpId_idx" ON "ServiceRFPDocument"("rfpId");

-- CreateIndex
CREATE INDEX "ServiceRFPDocument_uploadedAt_idx" ON "ServiceRFPDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "ServiceRFPDocument" ADD CONSTRAINT "ServiceRFPDocument_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "ServiceRFP"("id") ON DELETE CASCADE ON UPDATE CASCADE;
