-- Refactor HrProject table shape to align with PMO projects list payload.
-- Prisma model has been renamed to `Project` and mapped to this table via @@map("HrProject").

ALTER TABLE "public"."HrProject"
  DROP CONSTRAINT IF EXISTS "HrProject_departmentId_fkey";

DROP INDEX IF EXISTS "HrProject_departmentId_idx";

ALTER TABLE "public"."HrProject"
  DROP COLUMN IF EXISTS "departmentId";

ALTER TABLE "public"."HrProject"
  ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "projectManager" TEXT,
  ADD COLUMN IF NOT EXISTS "totalBudget" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "allocatedBudget" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "actualSpent" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "externalSystemId" TEXT;

CREATE INDEX IF NOT EXISTS "HrProject_departmentName_idx"
  ON "public"."HrProject"("departmentName");
