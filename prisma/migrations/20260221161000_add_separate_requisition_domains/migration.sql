-- CreateEnum
CREATE TYPE "MaterialRequisitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceRequisitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MixedRequisitionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'PARTIALLY_CONVERTED', 'CONVERTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MaterialRequisition" (
    "id" TEXT NOT NULL,
    "mrNumber" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterId" TEXT,
    "departmentId" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "MaterialRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedCost" DECIMAL(65,30) NOT NULL,
    "budgetCode" TEXT NOT NULL,
    "justification" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "projectId" TEXT,
    "costCenter" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequisitionLine" (
    "id" TEXT NOT NULL,
    "materialRequisitionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedPrice" DECIMAL(65,30) NOT NULL,
    "specifications" TEXT,
    "requiredDate" TIMESTAMP(3),

    CONSTRAINT "MaterialRequisitionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequisition" (
    "id" TEXT NOT NULL,
    "srNumber" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterId" TEXT,
    "departmentId" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "ServiceRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedCost" DECIMAL(65,30) NOT NULL,
    "budgetCode" TEXT NOT NULL,
    "justification" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "projectId" TEXT,
    "costCenter" TEXT,
    "createdBy" TEXT,
    "serviceScope" TEXT NOT NULL,
    "serviceCategory" TEXT,
    "serviceType" TEXT,
    "technicalSpecifications" TEXT,
    "duration" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL DEFAULT 'DAYS',
    "deliverables" JSONB NOT NULL,
    "performanceMetrics" JSONB,
    "paymentSchedule" TEXT NOT NULL DEFAULT 'MILESTONE',
    "paymentTerms" TEXT,
    "retentionPercentage" DECIMAL(65,30) DEFAULT 0,
    "insuranceRequired" BOOLEAN NOT NULL DEFAULT false,
    "certificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "safetyRequirements" TEXT,
    "preferredVendors" JSONB,
    "milestones" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequisitionLine" (
    "id" TEXT NOT NULL,
    "serviceRequisitionId" TEXT NOT NULL,
    "serviceItemId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "estimatedRate" DECIMAL(65,30) NOT NULL,
    "unit" TEXT DEFAULT 'Hours',
    "duration" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL DEFAULT 'DAYS',
    "specifications" TEXT,
    "deliverables" JSONB,
    "performanceMetrics" JSONB,

    CONSTRAINT "ServiceRequisitionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixedRequisitionBundle" (
    "id" TEXT NOT NULL,
    "bundleNumber" TEXT NOT NULL,
    "title" TEXT,
    "justification" TEXT,
    "status" "MixedRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "requesterId" TEXT,
    "departmentId" TEXT,
    "projectId" TEXT,
    "budgetCode" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "materialRequisitionId" TEXT,
    "serviceRequisitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MixedRequisitionBundle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequisition_mrNumber_key" ON "MaterialRequisition"("mrNumber");

-- CreateIndex
CREATE INDEX "MaterialRequisition_requesterId_idx" ON "MaterialRequisition"("requesterId");

-- CreateIndex
CREATE INDEX "MaterialRequisition_departmentId_idx" ON "MaterialRequisition"("departmentId");

-- CreateIndex
CREATE INDEX "MaterialRequisition_status_idx" ON "MaterialRequisition"("status");

-- CreateIndex
CREATE INDEX "MaterialRequisition_requestDate_idx" ON "MaterialRequisition"("requestDate");

-- CreateIndex
CREATE INDEX "MaterialRequisitionLine_materialRequisitionId_idx" ON "MaterialRequisitionLine"("materialRequisitionId");

-- CreateIndex
CREATE INDEX "MaterialRequisitionLine_itemId_idx" ON "MaterialRequisitionLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequisition_srNumber_key" ON "ServiceRequisition"("srNumber");

-- CreateIndex
CREATE INDEX "ServiceRequisition_requesterId_idx" ON "ServiceRequisition"("requesterId");

-- CreateIndex
CREATE INDEX "ServiceRequisition_departmentId_idx" ON "ServiceRequisition"("departmentId");

-- CreateIndex
CREATE INDEX "ServiceRequisition_status_idx" ON "ServiceRequisition"("status");

-- CreateIndex
CREATE INDEX "ServiceRequisition_requestDate_idx" ON "ServiceRequisition"("requestDate");

-- CreateIndex
CREATE INDEX "ServiceRequisitionLine_serviceRequisitionId_idx" ON "ServiceRequisitionLine"("serviceRequisitionId");

-- CreateIndex
CREATE INDEX "ServiceRequisitionLine_serviceItemId_idx" ON "ServiceRequisitionLine"("serviceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MixedRequisitionBundle_bundleNumber_key" ON "MixedRequisitionBundle"("bundleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MixedRequisitionBundle_materialRequisitionId_key" ON "MixedRequisitionBundle"("materialRequisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "MixedRequisitionBundle_serviceRequisitionId_key" ON "MixedRequisitionBundle"("serviceRequisitionId");

-- CreateIndex
CREATE INDEX "MixedRequisitionBundle_status_idx" ON "MixedRequisitionBundle"("status");

-- CreateIndex
CREATE INDEX "MixedRequisitionBundle_requesterId_idx" ON "MixedRequisitionBundle"("requesterId");

-- AddForeignKey
ALTER TABLE "MaterialRequisitionLine" ADD CONSTRAINT "MaterialRequisitionLine_materialRequisitionId_fkey" FOREIGN KEY ("materialRequisitionId") REFERENCES "MaterialRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequisitionLine" ADD CONSTRAINT "MaterialRequisitionLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequisitionLine" ADD CONSTRAINT "ServiceRequisitionLine_serviceRequisitionId_fkey" FOREIGN KEY ("serviceRequisitionId") REFERENCES "ServiceRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequisitionLine" ADD CONSTRAINT "ServiceRequisitionLine_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixedRequisitionBundle" ADD CONSTRAINT "MixedRequisitionBundle_materialRequisitionId_fkey" FOREIGN KEY ("materialRequisitionId") REFERENCES "MaterialRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixedRequisitionBundle" ADD CONSTRAINT "MixedRequisitionBundle_serviceRequisitionId_fkey" FOREIGN KEY ("serviceRequisitionId") REFERENCES "ServiceRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
