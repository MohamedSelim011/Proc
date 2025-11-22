-- Add Service-specific models

-- Service Categories (different from item categories)
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "requiresInsurance" BOOLEAN NOT NULL DEFAULT false,
    "requiresCertification" BOOLEAN NOT NULL DEFAULT false,
    "requiresPerformanceBond" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- Service Items (different from physical items)
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "serviceCategoryId" TEXT NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "standardRate" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "slaRequired" BOOLEAN NOT NULL DEFAULT false,
    "performanceMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- Service Purchase Requisitions
CREATE TABLE "ServicePR" (
    "id" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "serviceScope" TEXT NOT NULL,
    "technicalSpecifications" TEXT,
    "duration" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL DEFAULT 'DAYS',
    "deliverables" JSONB NOT NULL,
    "performanceMetrics" JSONB,
    "slaRequirements" JSONB,
    "insuranceRequired" BOOLEAN NOT NULL DEFAULT false,
    "certificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "safetyRequirements" TEXT,
    "paymentSchedule" TEXT NOT NULL DEFAULT 'MILESTONE',
    "retentionPercentage" DECIMAL(5,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePR_pkey" PRIMARY KEY ("id")
);

-- Service PR Items
CREATE TABLE "ServicePRItem" (
    "id" TEXT NOT NULL,
    "servicePRId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "estimatedRate" DECIMAL(65,30) NOT NULL,
    "duration" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL DEFAULT 'DAYS',
    "specifications" TEXT,
    "deliverables" JSONB,
    "performanceMetrics" JSONB,

    CONSTRAINT "ServicePRItem_pkey" PRIMARY KEY ("id")
);

-- Service Contracts (different from POs)
CREATE TABLE "ServiceContract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "contractType" TEXT NOT NULL DEFAULT 'SERVICE_AGREEMENT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalValue" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "paymentTerms" TEXT NOT NULL,
    "slaTerms" JSONB,
    "penaltyClause" TEXT,
    "performanceBond" DECIMAL(65,30),
    "retentionAmount" DECIMAL(65,30),
    "insuranceRequirements" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceContract_pkey" PRIMARY KEY ("id")
);

-- Service Milestones
CREATE TABLE "ServiceMilestone" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "milestoneNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completionCriteria" TEXT NOT NULL,
    "paymentPercentage" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ServiceMilestone_pkey" PRIMARY KEY ("id")
);

-- Service Receipt Notes (SRN) - equivalent to GRN for services
CREATE TABLE "ServiceReceipt" (
    "id" TEXT NOT NULL,
    "srnNumber" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceDescription" TEXT NOT NULL,
    "deliverables" JSONB NOT NULL,
    "qualityRating" DECIMAL(3,2),
    "performanceRating" DECIMAL(3,2),
    "completionPercentage" DECIMAL(5,2) NOT NULL,
    "acceptanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReceipt_pkey" PRIMARY KEY ("id")
);

-- Service Performance Tracking
CREATE TABLE "ServicePerformance" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "evaluationPeriod" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "qualityScore" DECIMAL(3,2) NOT NULL,
    "timelinessScore" DECIMAL(3,2) NOT NULL,
    "complianceScore" DECIMAL(3,2) NOT NULL,
    "overallScore" DECIMAL(3,2) NOT NULL,
    "kpiMetrics" JSONB,
    "slaCompliance" JSONB,
    "penalties" DECIMAL(65,30) DEFAULT 0,
    "bonuses" DECIMAL(65,30) DEFAULT 0,
    "evaluatedBy" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "ServicePerformance_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "ServiceCategory_code_key" ON "ServiceCategory"("code");
CREATE UNIQUE INDEX "ServiceItem_serviceCode_key" ON "ServiceItem"("serviceCode");
CREATE UNIQUE INDEX "ServicePR_prId_key" ON "ServicePR"("prId");
CREATE UNIQUE INDEX "ServiceContract_contractNumber_key" ON "ServiceContract"("contractNumber");
CREATE UNIQUE INDEX "ServiceReceipt_srnNumber_key" ON "ServiceReceipt"("srnNumber");

-- Add foreign key constraints
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Note: PurchaseRequisition and Vendor tables should exist before these foreign keys are created
-- If they don't exist, you'll need to create them first or remove these constraints temporarily
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PurchaseRequisition') THEN
        ALTER TABLE "ServicePR" ADD CONSTRAINT "ServicePR_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PurchaseRequisition') THEN
        ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Vendor') THEN
        ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "ServicePRItem" ADD CONSTRAINT "ServicePRItem_servicePRId_fkey" FOREIGN KEY ("servicePRId") REFERENCES "ServicePR"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicePRItem" ADD CONSTRAINT "ServicePRItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceMilestone" ADD CONSTRAINT "ServiceMilestone_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServiceContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceReceipt" ADD CONSTRAINT "ServiceReceipt_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServiceContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReceipt" ADD CONSTRAINT "ServiceReceipt_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ServiceMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServicePerformance" ADD CONSTRAINT "ServicePerformance_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServiceContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
