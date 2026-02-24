ALTER TABLE "PurchaseRequisition"
ADD COLUMN IF NOT EXISTS "sourceMaterialRequestId" TEXT;

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_sourceMaterialRequestId_idx"
ON "PurchaseRequisition"("sourceMaterialRequestId");

-- Convert any previously stored external IDs into local HrMaterialRequest IDs.
UPDATE "PurchaseRequisition" pr
SET "sourceMaterialRequestId" = hr."id"
FROM "HrMaterialRequest" hr
WHERE pr."sourceMaterialRequestId" = hr."externalId";

-- If there are still non-matching values, null them to allow FK creation.
UPDATE "PurchaseRequisition"
SET "sourceMaterialRequestId" = NULL
WHERE "sourceMaterialRequestId" IS NOT NULL
  AND "sourceMaterialRequestId" NOT IN (SELECT "id" FROM "HrMaterialRequest");

ALTER TABLE "PurchaseRequisition"
DROP CONSTRAINT IF EXISTS "PurchaseRequisition_sourceMaterialRequestId_fkey";

ALTER TABLE "PurchaseRequisition"
ADD CONSTRAINT "PurchaseRequisition_sourceMaterialRequestId_fkey"
FOREIGN KEY ("sourceMaterialRequestId")
REFERENCES "HrMaterialRequest"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
