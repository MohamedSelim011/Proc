ALTER TABLE "PurchaseRequisition"
  DROP COLUMN IF EXISTS "budgetCode",
  DROP COLUMN IF EXISTS "costCenter";

ALTER TABLE "ServicePR"
  DROP COLUMN IF EXISTS "insuranceRequired";
