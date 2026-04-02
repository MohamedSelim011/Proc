-- Normalize legacy values before adding FK constraints.
UPDATE "PurchaseRequisition" pr
SET "departmentId" = NULL
WHERE pr."departmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "HrDepartment" d
    WHERE d."id" = pr."departmentId"
  );

UPDATE "PurchaseRequisition" pr
SET "projectId" = NULL
WHERE pr."projectId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "HrProject" p
    WHERE p."id" = pr."projectId"
  );

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_departmentId_idx" ON "PurchaseRequisition"("departmentId");
CREATE INDEX IF NOT EXISTS "PurchaseRequisition_projectId_idx" ON "PurchaseRequisition"("projectId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PurchaseRequisition_departmentId_fkey'
  ) THEN
    ALTER TABLE "PurchaseRequisition"
    ADD CONSTRAINT "PurchaseRequisition_departmentId_fkey"
      FOREIGN KEY ("departmentId")
      REFERENCES "HrDepartment"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PurchaseRequisition_projectId_fkey'
  ) THEN
    ALTER TABLE "PurchaseRequisition"
    ADD CONSTRAINT "PurchaseRequisition_projectId_fkey"
      FOREIGN KEY ("projectId")
      REFERENCES "HrProject"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
