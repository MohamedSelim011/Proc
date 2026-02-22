-- CreateTable
CREATE TABLE "public"."RFQDocument" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RFQDocument_rfqId_idx" ON "public"."RFQDocument"("rfqId");

-- CreateIndex
CREATE INDEX "RFQDocument_uploadedAt_idx" ON "public"."RFQDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "public"."RFQDocument" ADD CONSTRAINT "RFQDocument_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "public"."RFQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;
