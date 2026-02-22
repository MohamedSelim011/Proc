-- CreateTable
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "public"."Company"("code");

-- Seed default company used for backfill
INSERT INTO "public"."Company" ("id", "code", "name")
VALUES ('company_wujha_default', 'WUJ', 'WUJHA')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "companyId" TEXT;

-- Backfill existing users
UPDATE "public"."User"
SET "companyId" = 'company_wujha_default'
WHERE "companyId" IS NULL;

-- Make required after backfill
ALTER TABLE "public"."User" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "public"."User"("companyId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
