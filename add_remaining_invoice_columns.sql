-- Add all remaining missing columns to Invoice table
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "attachments" TEXT[] DEFAULT '{}';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentDate" TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;