-- CreateTable
CREATE TABLE "public"."HrMaterialRequest" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "quantity" INTEGER,
    "description" TEXT,
    "notes" TEXT,
    "departmentName" TEXT,
    "categoryName" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "fiscalYear" INTEGER,
    "quarter" INTEGER,
    "budgetTotalAmount" DECIMAL(65,30),
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrMaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentEscalation" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "reason" TEXT,
    "amount" DECIMAL(65,30),
    "currency" TEXT,
    "requestedBy" TEXT,
    "approver" TEXT,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrMaterialRequest_externalId_key" ON "public"."HrMaterialRequest"("externalId");

-- CreateIndex
CREATE INDEX "HrMaterialRequest_status_idx" ON "public"."HrMaterialRequest"("status");

-- CreateIndex
CREATE INDEX "HrMaterialRequest_departmentName_idx" ON "public"."HrMaterialRequest"("departmentName");

-- CreateIndex
CREATE INDEX "HrMaterialRequest_externalUpdatedAt_idx" ON "public"."HrMaterialRequest"("externalUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEscalation_externalId_key" ON "public"."PaymentEscalation"("externalId");

-- CreateIndex
CREATE INDEX "PaymentEscalation_status_idx" ON "public"."PaymentEscalation"("status");

-- CreateIndex
CREATE INDEX "PaymentEscalation_priority_idx" ON "public"."PaymentEscalation"("priority");

-- CreateIndex
CREATE INDEX "PaymentEscalation_externalUpdatedAt_idx" ON "public"."PaymentEscalation"("externalUpdatedAt");
