-- Expand HR material request fields for full external payload fidelity and workflow actions
ALTER TABLE "HrMaterialRequest"
ADD COLUMN "budgetExternalId" TEXT,
ADD COLUMN "departmentExternalId" TEXT,
ADD COLUMN "categoryExternalId" TEXT,
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "approvedByExternal" TEXT,
ADD COLUMN "categoryPriceLimit" DECIMAL(65,30),
ADD COLUMN "budgetCategoryBudgets" JSONB,
ADD COLUMN "requesterFirstName" TEXT,
ADD COLUMN "requesterLastName" TEXT,
ADD COLUMN "requesterExternalId" TEXT,
ADD COLUMN "externalVersion" INTEGER;
