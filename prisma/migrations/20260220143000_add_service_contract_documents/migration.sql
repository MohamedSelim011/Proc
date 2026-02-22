-- CreateTable
CREATE TABLE "ServiceContractDocument" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceContractDocument_contractId_idx" ON "ServiceContractDocument"("contractId");

-- CreateIndex
CREATE INDEX "ServiceContractDocument_uploadedAt_idx" ON "ServiceContractDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "ServiceContractDocument" ADD CONSTRAINT "ServiceContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServiceContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
