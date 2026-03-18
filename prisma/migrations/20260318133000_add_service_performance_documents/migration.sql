-- CreateTable
CREATE TABLE "ServicePerformanceDocument" (
    "id" TEXT NOT NULL,
    "performanceId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePerformanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePerformanceDocument_performanceId_idx" ON "ServicePerformanceDocument"("performanceId");

-- CreateIndex
CREATE INDEX "ServicePerformanceDocument_uploadedAt_idx" ON "ServicePerformanceDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "ServicePerformanceDocument" ADD CONSTRAINT "ServicePerformanceDocument_performanceId_fkey" FOREIGN KEY ("performanceId") REFERENCES "ServicePerformance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
