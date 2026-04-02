ALTER TABLE "public"."HrProject"
  ADD COLUMN IF NOT EXISTS "companyId" TEXT;

CREATE INDEX IF NOT EXISTS "HrProject_companyId_idx"
  ON "public"."HrProject"("companyId");