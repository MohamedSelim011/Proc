-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'PROCUREMENT_MANAGER', 'BUDGET_CONTROLLER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'WAREHOUSE_KEEPER', 'PROCUREMENT_OFFICER', 'APPROVER', 'VIEWER', 'REQUESTOR', 'DEPARTMENT_MANAGER', 'CPO', 'WAREHOUSE_MANAGER', 'SERVICE_MANAGER', 'AUDITOR', 'VENDOR');

-- CreateEnum
CREATE TYPE "public"."VendorStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "public"."ItemType" AS ENUM ('STOCK', 'NON_STOCK', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."PRStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."POStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RFQStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'EVALUATED', 'AWARDED');

-- CreateEnum
CREATE TYPE "public"."RFQResponseStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."GRStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."MatchingStatus" AS ENUM ('PENDING', 'MATCHED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "public"."RACIType" AS ENUM ('RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED');

-- CreateEnum
CREATE TYPE "public"."ConsultationStatus" AS ENUM ('PENDING', 'RESPONDED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ServiceContractStatus" AS ENUM ('DRAFT', 'APPROVED', 'SIGNED', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "public"."WorkflowType" AS ENUM ('APPROVAL', 'NOTIFICATION', 'VALIDATION', 'GENERATION');

-- CreateEnum
CREATE TYPE "public"."WorkflowStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ESCALATED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."StepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'ESCALATED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."TriggerType" AS ENUM ('INVENTORY_LEVEL', 'BUDGET_THRESHOLD', 'TIME_BASED', 'STATUS_CHANGE', 'DOCUMENT_CREATION');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('EMAIL', 'SMS', 'SYSTEM', 'PUSH');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "mobile" TEXT,
    "department" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'VIEWER',
    "approvalLimit" DECIMAL(65,30) DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "passwordChangedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIP" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vendor" (
    "id" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "crNumber" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "vatNumber" TEXT,
    "primaryContactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "businessType" TEXT NOT NULL,
    "yearEstablished" INTEGER NOT NULL,
    "numberOfEmployees" INTEGER NOT NULL,
    "omanizationPercentage" DOUBLE PRECISION,
    "status" "public"."VendorStatus" NOT NULL DEFAULT 'PENDING',
    "performanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VendorCategory" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VendorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VendorDocument" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VendorEvaluation" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "evaluationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "deliveryScore" DOUBLE PRECISION NOT NULL,
    "priceScore" DOUBLE PRECISION NOT NULL,
    "serviceScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "evaluatedBy" TEXT NOT NULL,

    CONSTRAINT "VendorEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Item" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "minStockLevel" INTEGER,
    "maxStockLevel" INTEGER,
    "reorderPoint" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseRequisition" (
    "id" TEXT NOT NULL,
    "prNumber" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterId" TEXT,
    "departmentId" TEXT NOT NULL,
    "itemType" "public"."ItemType" NOT NULL,
    "priority" "public"."Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "public"."PRStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedCost" DECIMAL(65,30) NOT NULL,
    "budgetCode" TEXT NOT NULL,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PRItem" (
    "id" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedPrice" DECIMAL(65,30) NOT NULL,
    "specifications" TEXT,
    "requiredDate" TIMESTAMP(3),

    CONSTRAINT "PRItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RFQ" (
    "id" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "prId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closingDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."RFQStatus" NOT NULL DEFAULT 'DRAFT',
    "evaluationCriteria" TEXT,
    "termsAndConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RFQResponse" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "public"."RFQResponseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "technicalScore" DOUBLE PRECISION,
    "commercialScore" DOUBLE PRECISION,

    CONSTRAINT "RFQResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "prId" TEXT,
    "vendorId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "deliveryAddress" JSONB NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "status" "public"."POStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."POItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "deliveryDate" TIMESTAMP(3),

    CONSTRAINT "POItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."POAmendment" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "amendmentNo" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoodsReceipt" (
    "id" TEXT NOT NULL,
    "grNumber" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "status" "public"."GRStatus" NOT NULL DEFAULT 'PENDING',
    "qualityChecked" BOOLEAN NOT NULL DEFAULT false,
    "qualityComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GRItem" (
    "id" TEXT NOT NULL,
    "grId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "acceptedQuantity" INTEGER NOT NULL,
    "rejectedQuantity" INTEGER NOT NULL,
    "rejectionReason" TEXT,

    CONSTRAINT "GRItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poId" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "threeWayMatched" BOOLEAN NOT NULL DEFAULT false,
    "matchingComments" TEXT,
    "matchingStatus" "public"."MatchingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "paymentReference" TEXT,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "paymentTerms" TEXT,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "poItemId" TEXT,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Approval" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "purchaseRequisitionId" TEXT,
    "purchaseOrderId" TEXT,
    "invoiceId" TEXT,
    "prId" TEXT,
    "approverId" TEXT NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "level" INTEGER NOT NULL,
    "routingRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ApprovalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalRouting" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "approverRole" "public"."UserRole" NOT NULL,
    "raciType" "public"."RACIType" NOT NULL DEFAULT 'ACCOUNTABLE',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "timeoutHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRouting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalNotification" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "approvalId" TEXT,
    "userId" TEXT NOT NULL,
    "raciType" "public"."RACIType" NOT NULL DEFAULT 'INFORMED',
    "notificationType" "public"."NotificationType" NOT NULL DEFAULT 'EMAIL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalConsultation" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "approvalId" TEXT,
    "consultedUserId" TEXT NOT NULL,
    "consultedRole" "public"."UserRole",
    "raciType" "public"."RACIType" NOT NULL DEFAULT 'CONSULTED',
    "status" "public"."ConsultationStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalHistory" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "previousStatus" "public"."ApprovalStatus",
    "newStatus" "public"."ApprovalStatus" NOT NULL,
    "comments" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceCategory" (
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

-- CreateTable
CREATE TABLE "public"."ServiceItem" (
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

-- CreateTable
CREATE TABLE "public"."ServicePR" (
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
    "retentionPercentage" DECIMAL(65,30) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServicePRItem" (
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

-- CreateTable
CREATE TABLE "public"."ServiceContract" (
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
    "status" "public"."ServiceContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceMilestone" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "milestoneNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completionCriteria" TEXT NOT NULL,
    "paymentPercentage" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "public"."MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ServiceMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceReceipt" (
    "id" TEXT NOT NULL,
    "srnNumber" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceDescription" TEXT NOT NULL,
    "deliverables" JSONB NOT NULL,
    "qualityRating" DECIMAL(65,30),
    "performanceRating" DECIMAL(65,30),
    "completionPercentage" DECIMAL(65,30) NOT NULL,
    "acceptanceStatus" "public"."AcceptanceStatus" NOT NULL DEFAULT 'PENDING',
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

-- CreateTable
CREATE TABLE "public"."ServicePerformance" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "evaluationPeriod" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "qualityScore" DECIMAL(65,30) NOT NULL,
    "timelinessScore" DECIMAL(65,30) NOT NULL,
    "complianceScore" DECIMAL(65,30) NOT NULL,
    "overallScore" DECIMAL(65,30) NOT NULL,
    "kpiMetrics" JSONB,
    "slaCompliance" JSONB,
    "penalties" DECIMAL(65,30) DEFAULT 0,
    "bonuses" DECIMAL(65,30) DEFAULT 0,
    "evaluatedBy" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "ServicePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workflowType" "public"."WorkflowType" NOT NULL,
    "documentType" TEXT NOT NULL,
    "triggerConditions" JSONB NOT NULL,
    "approvalSteps" JSONB NOT NULL,
    "notifications" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowInstance" (
    "id" TEXT NOT NULL,
    "workflowDefId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL,
    "status" "public"."WorkflowStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowStep" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT,
    "status" "public"."StepStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "actionTaken" TEXT,
    "processedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutomationTrigger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" "public"."TriggerType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "targetWorkflow" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationQueue" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "templateData" JSONB,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalMatrix" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "department" TEXT,
    "amountMin" DECIMAL(65,30),
    "amountMax" DECIMAL(65,30),
    "approverRole" TEXT NOT NULL,
    "approverLevel" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProcessAudit" (
    "id" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ProcessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "public"."User"("employeeId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "public"."User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "public"."Session"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordHistory_userId_idx" ON "public"."PasswordHistory"("userId");

-- CreateIndex
CREATE INDEX "PasswordHistory_createdAt_idx" ON "public"."PasswordHistory"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "public"."AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "public"."Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "public"."Permission"("module");

-- CreateIndex
CREATE INDEX "Permission_action_idx" ON "public"."Permission"("action");

-- CreateIndex
CREATE INDEX "Permission_isActive_idx" ON "public"."Permission"("isActive");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "public"."RolePermission"("role");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "public"."RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "RolePermission_isActive_idx" ON "public"."RolePermission"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "public"."RolePermission"("role", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorCode_key" ON "public"."Vendor"("vendorCode");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_crNumber_key" ON "public"."Vendor"("crNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_taxId_key" ON "public"."Vendor"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorCategory_vendorId_categoryId_key" ON "public"."VendorCategory"("vendorId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "public"."Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Item_itemCode_key" ON "public"."Item"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequisition_prNumber_key" ON "public"."PurchaseRequisition"("prNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_requesterId_idx" ON "public"."PurchaseRequisition"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_rfqNumber_key" ON "public"."RFQ"("rfqNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RFQResponse_rfqId_vendorId_key" ON "public"."RFQResponse"("rfqId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "public"."PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_grNumber_key" ON "public"."GoodsReceipt"("grNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "public"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Approval_approverId_idx" ON "public"."Approval"("approverId");

-- CreateIndex
CREATE INDEX "Approval_prId_idx" ON "public"."Approval"("prId");

-- CreateIndex
CREATE INDEX "Approval_purchaseRequisitionId_idx" ON "public"."Approval"("purchaseRequisitionId");

-- CreateIndex
CREATE INDEX "Approval_purchaseOrderId_idx" ON "public"."Approval"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "Approval_invoiceId_idx" ON "public"."Approval"("invoiceId");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "public"."Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_routingRuleId_idx" ON "public"."Approval"("routingRuleId");

-- CreateIndex
CREATE INDEX "ApprovalRule_documentType_idx" ON "public"."ApprovalRule"("documentType");

-- CreateIndex
CREATE INDEX "ApprovalRule_isActive_idx" ON "public"."ApprovalRule"("isActive");

-- CreateIndex
CREATE INDEX "ApprovalRule_priority_idx" ON "public"."ApprovalRule"("priority");

-- CreateIndex
CREATE INDEX "ApprovalRouting_ruleId_idx" ON "public"."ApprovalRouting"("ruleId");

-- CreateIndex
CREATE INDEX "ApprovalRouting_approverRole_idx" ON "public"."ApprovalRouting"("approverRole");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRouting_ruleId_level_key" ON "public"."ApprovalRouting"("ruleId", "level");

-- CreateIndex
CREATE INDEX "ApprovalNotification_userId_idx" ON "public"."ApprovalNotification"("userId");

-- CreateIndex
CREATE INDEX "ApprovalNotification_documentId_idx" ON "public"."ApprovalNotification"("documentId");

-- CreateIndex
CREATE INDEX "ApprovalNotification_isRead_idx" ON "public"."ApprovalNotification"("isRead");

-- CreateIndex
CREATE INDEX "ApprovalConsultation_consultedUserId_idx" ON "public"."ApprovalConsultation"("consultedUserId");

-- CreateIndex
CREATE INDEX "ApprovalConsultation_documentId_idx" ON "public"."ApprovalConsultation"("documentId");

-- CreateIndex
CREATE INDEX "ApprovalConsultation_status_idx" ON "public"."ApprovalConsultation"("status");

-- CreateIndex
CREATE INDEX "ApprovalHistory_approvalId_idx" ON "public"."ApprovalHistory"("approvalId");

-- CreateIndex
CREATE INDEX "ApprovalHistory_performedBy_idx" ON "public"."ApprovalHistory"("performedBy");

-- CreateIndex
CREATE INDEX "ApprovalHistory_level_idx" ON "public"."ApprovalHistory"("level");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_code_key" ON "public"."ServiceCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_serviceCode_key" ON "public"."ServiceItem"("serviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePR_prId_key" ON "public"."ServicePR"("prId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceContract_contractNumber_key" ON "public"."ServiceContract"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReceipt_srnNumber_key" ON "public"."ServiceReceipt"("srnNumber");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordHistory" ADD CONSTRAINT "PasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VendorCategory" ADD CONSTRAINT "VendorCategory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VendorCategory" ADD CONSTRAINT "VendorCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VendorEvaluation" ADD CONSTRAINT "VendorEvaluation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PRItem" ADD CONSTRAINT "PRItem_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PRItem" ADD CONSTRAINT "PRItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFQ" ADD CONSTRAINT "RFQ_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFQResponse" ADD CONSTRAINT "RFQResponse_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "public"."RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFQResponse" ADD CONSTRAINT "RFQResponse_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."POItem" ADD CONSTRAINT "POItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."POItem" ADD CONSTRAINT "POItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."POAmendment" ADD CONSTRAINT "POAmendment_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GRItem" ADD CONSTRAINT "GRItem_grId_fkey" FOREIGN KEY ("grId") REFERENCES "public"."GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GRItem" ADD CONSTRAINT "GRItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "public"."POItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Approval" ADD CONSTRAINT "Approval_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalRouting" ADD CONSTRAINT "ApprovalRouting_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."ApprovalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "public"."Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceItem" ADD CONSTRAINT "ServiceItem_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "public"."ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServicePR" ADD CONSTRAINT "ServicePR_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServicePRItem" ADD CONSTRAINT "ServicePRItem_servicePRId_fkey" FOREIGN KEY ("servicePRId") REFERENCES "public"."ServicePR"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServicePRItem" ADD CONSTRAINT "ServicePRItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "public"."ServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceContract" ADD CONSTRAINT "ServiceContract_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceContract" ADD CONSTRAINT "ServiceContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceMilestone" ADD CONSTRAINT "ServiceMilestone_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."ServiceContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceReceipt" ADD CONSTRAINT "ServiceReceipt_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."ServiceContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceReceipt" ADD CONSTRAINT "ServiceReceipt_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."ServiceMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServicePerformance" ADD CONSTRAINT "ServicePerformance_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."ServiceContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowDefId_fkey" FOREIGN KEY ("workflowDefId") REFERENCES "public"."WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowStep" ADD CONSTRAINT "WorkflowStep_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "public"."WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
